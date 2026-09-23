import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables if not already populated
if (!process.env.GEMINI_API_KEY) {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath);
      } else {
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            process.env[match[1]] = (match[2] || '').replace(/(^['"]|['"]$)/g, '').trim();
          }
        }
      }
    } catch (err) {
      console.warn('Warning: Could not automatically load .env file:', err.message);
    }
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is missing.');
  process.exit(1);
}

const topicsFilePath = path.join(rootDir, 'topics.json');
if (!fs.existsSync(topicsFilePath)) {
  console.error(`Error: topics.json not found at ${topicsFilePath}`);
  process.exit(1);
}

let topics;
try {
  topics = JSON.parse(fs.readFileSync(topicsFilePath, 'utf8'));
} catch (err) {
  console.error('Error: Failed to parse topics.json:', err.message);
  process.exit(1);
}

const pendingIndex = topics.findIndex((item) => item.status === 'pending');
if (pendingIndex === -1) {
  console.log('No pending topics found in queue. Exiting successfully.');
  process.exit(0);
}

const task = topics[pendingIndex];
console.log(`Processing topic [${pendingIndex + 1}/${topics.length}]: "${task.title}" (slug: ${task.slug}, category: ${task.category})`);

const today = new Date().toISOString().split('T')[0];

const prompt = `You are a Senior AdOps Infrastructure Architect and Affiliate Technical Writer.
Write an in-depth, production-ready technical manual in MDX format for the AdOps Handbook.

Topic details:
- Title: ${task.title}
- Slug: ${task.slug}
- Category: ${task.category}
- Tags: ${JSON.stringify(task.tags)}
- Publication Date: ${today}
- Author: AdOps Technical Team

Required Structure & Guidelines:
1. Complete YAML Frontmatter at the very beginning:
---
title: "${task.title}"
description: "A comprehensive technical guide to ${task.title.toLowerCase()}."
category: "${task.category}"
pubDate: "${today}"
tags: ${JSON.stringify(task.tags)}
author: "AdOps Technical Team"
---

2. Architecture / Technical Overview:
- 2-3 concise, highly technical sentences explaining what architecture is being deployed, what technical problem is being solved, and how it mitigates tracking loss or account bans.

3. Core Parameter & Options Table:
- Markdown comparison table detailing parameters, headers, ports, macros, flags, or configuration options with practical recommendations.

4. Step-by-Step Implementation:
- Sequential numbered steps (1., 2., 3., etc.).
- Real-world, copy-paste code snippets with appropriate syntax highlighting identifiers (e.g. \`\`\`bash, \`\`\`nginx, \`\`\`json, \`\`\`javascript).
- Explicit inline callouts for high-risk operations, ban hazards, or fingerprint leaks using:
> **Warning:** Detailed warning of actions that trigger account bans or tracking failure.
or
> **Critical Note:** Crucial technical gotcha.

5. Diagnostics & Common Pitfalls:
- Checklist with 3-5 concrete diagnostic tests to verify the setup before sending production traffic or spending ad budget.
- Clear breakdown of common failure modes, leaks, or postback discrepancies and how to rectify them.

Formatting Requirements:
- Write strictly in valid MDX.
- Do NOT wrap the entire output in outer markdown backticks (\`\`\`mdx or \`\`\`). Return the raw MDX starting directly with the \`---\` frontmatter.`;

function cleanMarkdownFences(rawContent) {
  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:mdx|markdown)?\r?\n/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\r?\n```$/, '');
  }
  return cleaned.trim();
}

async function fetchGenerationWithModel(modelName) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });
  return response;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  // Default to requested gemini-2.5-flash, with automatic fallback if deprecated/unavailable
  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
  ];

  let rawText = null;

  for (const model of candidateModels) {
    console.log(`Sending generation request to Gemini API (${model})...`);
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await fetchGenerationWithModel(model);

        if (response.ok) {
          const result = await response.json();
          rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) break;
        }

        const errorBody = await response.text();
        console.warn(`Gemini API response for ${model} (attempt ${attempt}/${maxAttempts}, status ${response.status}):`, errorBody);

        // If the model is 404 (e.g. deprecated / no longer available), break attempt loop to try fallback model
        if (response.status === 404) {
          console.warn(`Model ${model} is not available (HTTP 404). Trying next compatible model...`);
          break;
        }

        // If 503 (high demand spike) or 429, wait and retry
        if (response.status === 503 || response.status === 429) {
          await sleep(2000 * attempt);
          continue;
        }

        break;
      } catch (networkErr) {
        console.warn(`Network error querying ${model}:`, networkErr.message);
        if (attempt < maxAttempts) await sleep(2000);
      }
    }

    if (rawText) {
      console.log(`Successfully generated content using model: ${model}`);
      break;
    }
  }

  if (!rawText) {
    console.error('Error: Failed to obtain valid content from Gemini API across candidate models.');
    process.exit(1);
  }

  const mdxContent = cleanMarkdownFences(rawText);

  // Destination directory and file path
  const targetDir = path.join(rootDir, 'src', 'content', 'docs', task.category);
  fs.mkdirSync(targetDir, { recursive: true });

  const targetFilePath = path.join(targetDir, `${task.slug}.mdx`);
  fs.writeFileSync(targetFilePath, mdxContent, 'utf8');
  console.log(`Successfully generated article: ${targetFilePath}`);

  // Mark task as completed in topics.json
  topics[pendingIndex].status = 'completed';
  fs.writeFileSync(topicsFilePath, JSON.stringify(topics, null, 2) + '\n', 'utf8');
  console.log(`Updated topics.json: marked "${task.slug}" as completed.`);
}

run().catch((err) => {
  console.error('Unhandled execution error:', err);
  process.exit(1);
});
