# AdOps Handbook Style & Layout Guide

Every generated MDX guide must follow this baseline layout:

1. **Frontmatter**: YAML metadata at the very beginning (title, description, category, tags, pubDate).
2. **Architecture / Overview**: Short 2-3 sentence technical summary of what is being built or solved.
3. **Core Parameter Table**: A markdown table comparing options, ports, macros, or config flags.
4. **Step-by-Step Implementation**:
   - Sequential numbered steps (`1.`, `2.`, `3.`).
   - Copy-paste code blocks with language identifiers (`bash`, `nginx`, `json`).
   - Explicit inline callouts for dangerous actions:
     > **Critical Note:** Explaining what causes an immediate account ban or leak.
5. **Verification & Diagnostics**:
   - 3-5 bullet points explaining how to test if the setup works before spending budget.