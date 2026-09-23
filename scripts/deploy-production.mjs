import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
let ssh2;
try {
  ssh2 = require('ssh2');
} catch {
  try {
    ssh2 = require('d:/WEB/antigravity/affiliate/node_modules/ssh2');
  } catch (err) {
    console.error('Failed to load ssh2:', err.message);
    process.exit(1);
  }
}

const HOST = '178.128.199.28';
const USER = 'root';
const KEY_PATH = path.join(rootDir, 'do_key.pem');
const LOCAL_DIST = path.join(rootDir, 'dist');
const TAR_FILE = path.join(rootDir, 'dist.tar.gz');
const REMOTE_TAR = '/tmp/affiliate_core_dist.tar.gz';
const REMOTE_DIST = '/var/www/affiliate-core/dist';

if (!fs.existsSync(KEY_PATH)) {
  console.error(`Private key not found at ${KEY_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(LOCAL_DIST)) {
  console.error(`Local dist not found. Run 'npm run build' first.`);
  process.exit(1);
}

console.log('📦 Packing local dist/ into dist.tar.gz...');
if (fs.existsSync(TAR_FILE)) fs.unlinkSync(TAR_FILE);
execSync(`tar -czf "${TAR_FILE}" -C "${LOCAL_DIST}" .`, { stdio: 'inherit' });
const tarSize = fs.statSync(TAR_FILE).size;
console.log(` Archive created: ${(tarSize / 1024).toFixed(1)} KB`);

const privateKey = fs.readFileSync(KEY_PATH);
const conn = new ssh2.Client();

conn.on('ready', () => {
  console.log(` Connected to ${HOST} as ${USER}`);

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }

    console.log(` Uploading ${TAR_FILE} -> ${REMOTE_TAR}...`);
    sftp.fastPut(TAR_FILE, REMOTE_TAR, (putErr) => {
      if (putErr) {
        console.error('Upload failed:', putErr);
        conn.end();
        process.exit(1);
      }
      console.log(' Archive uploaded successfully!');

      const extractCmd = `
        mkdir -p ${REMOTE_DIST} &&
        tar -xzf ${REMOTE_TAR} -C ${REMOTE_DIST} &&
        rm -f ${REMOTE_TAR} &&
        chown -R www-data:www-data /var/www/affiliate-core &&
        chmod -R 755 /var/www/affiliate-core &&
        ls -la ${REMOTE_DIST}
      `;

      console.log(' Extracting archive and setting permissions on remote server...');
      conn.exec(extractCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Extract error:', execErr);
          conn.end();
          process.exit(1);
        }
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
          conn.end();
          if (fs.existsSync(TAR_FILE)) fs.unlinkSync(TAR_FILE);
          if (code === 0) {
            console.log('\n Remote files in /var/www/affiliate-core/dist:');
            console.log(output);
            console.log(' Deployment completed successfully in a few seconds!');
          } else {
            console.error(`Command exited with code ${code}`);
            process.exit(code);
          }
        });
      });
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH error:', err.message);
});

conn.connect({
  host: HOST,
  username: USER,
  privateKey,
});
