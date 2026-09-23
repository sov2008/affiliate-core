# UI & Design System Tokens

## 1. Aesthetic Direction
- Theme: Strictly Dark Mode by default.
- Palette: Dark Slate / Zinc (inspired by Developer tools, Linear, Stripe Docs).
- Typography: Sans-serif (Inter / Geist) for UI prose; Monospace (JetBrains Mono / Fira Code) for metrics, code snippets, and affiliate terms.

## 2. Standard Tailwind Classes
- Backgrounds:
  - Page Background: `bg-slate-950`
  - Sidebar / Header: `bg-slate-900`
  - Cards / Containers: `bg-slate-900/60 border border-slate-800`
  - Hover states: `hover:bg-slate-800/50`
- Typography:
  - Headings: `text-slate-100 font-semibold tracking-tight`
  - Body text: `text-slate-400 leading-relaxed`
  - Accent / Links: `text-emerald-400 hover:text-emerald-300` or `text-cyan-400`
  - Code inline: `bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono text-sm`
- UI Controls:
  - Primary Button: `bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition`
  - Inputs / Forms: `bg-slate-950 border border-slate-700 text-slate-100 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none`
- Documentation Callouts:
  - Info / Note: `border-l-4 border-blue-500 bg-blue-950/20 text-blue-200 p-4 rounded-r-lg`
  - Warning / Ban Risk: `border-l-4 border-amber-500 bg-amber-950/20 text-amber-200 p-4 rounded-r-lg`