# Architecture Specification: AdOps Handbook

## 1. Tech Stack
- Framework: Astro (v4+ / Content Collections API)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS (Mobile-first, responsive)
- Icons: Lucide Icons (`lucide-react` or `astro-icon`)
- Search: Pagefind (static client-side search)
- Deployment: Docker (Node build stage -> Nginx Alpine runtime) on DigitalOcean

## 2. Directory Structure Convention
affiliate-core/
├── src/
│   ├── content/
│   │   ├── config.ts              # Collection schemas (Zod)
│   │   └── docs/                  # Markdown/MDX manuals
│   │       ├── infrastructure/
│   │       ├── tracking/
│   │       └── troubleshooting/
│   ├── pages/
│   │   ├── index.astro            # Landing / Documentation hub
│   │   ├── docs/[...slug].astro   # Dynamic documentation reader
│   │   └── tools/                 # Interactive client-side utilities
│   │       ├── index.astro        # Tools listing
│   │       └── [tool-name].astro  # Specific standalone utility
│   ├── components/
│   │   ├── layout/                # Header, Sidebar, Footer, Container
│   │   ├── ui/                    # Button, Input, Card, Badge, Alert
│   │   └── doc/                   # Callout, CodeBlock, TableOfContents
│   └── layouts/
│       ├── BaseLayout.astro       # HTML wrapper, meta tags, theme
│       └── DocLayout.astro        # Layout with documentation sidebar
├── public/                        # Static assets, fonts, icons
├── Dockerfile                     # Multi-stage production container
└── nginx.conf                     # Nginx routing configuration

## 3. Engineering Rules for Coding Prompts
- Tools Architecture: All utilities under `/pages/tools/` MUST be 100% Client-Side. No external server API calls or heavy backend dependencies. Everything runs in-browser (Canvas, Web Crypto, Web Workers).
- Components: Prefer lightweight Astro components. Use vanilla JS/TS `<script>` tags inside Astro components for interactivity, or preact/react islands only when complex state is required.
- Build Verification: Any task must be self-contained so that running `npm run build` exits with code 0.