# base-app

A template repository containing AI development workflows, Cursor rules, agent skills, and system prompts for building production-quality apps.

## What's Included

### Cursor Rules (`.cursor/rules/`)

| File | Purpose |
|------|---------|
| `best-practices.mdc` | Comprehensive dev standards: TypeScript strict mode, React Native patterns, accessibility, security, testing, and more |
| `caveman.mdc` | Terse communication mode — reduces AI response tokens ~75% while keeping full technical accuracy |
| `create-update-instructions.mdc` | Workflow for generating versioned update instruction documents |
| `create-update-instructions-examples.md` | Examples for the update instruction generation system |
| `update-workflow.mdc` | Versioned fix request processing (`Fix 1.A.T6.1`, `Update 1.A.T6.1 complete`) |
| `update-workflow-examples.md` | Examples for the update workflow system |
| `supabase-mcp.mdc` | Supabase MCP tool usage guide — update `YOUR_PROJECT_ID` with your Supabase project ID |

### Agent Skills (`.agents/skills/`)

**From [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman):**

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `caveman` | `/caveman` | Ultra-compressed communication. ~75% fewer response tokens. |
| `caveman-commit` | `/caveman-commit` | Terse, opinionated Conventional Commits messages |
| `caveman-review` | `/caveman-review` | One-line PR comments: `L42: bug: user null. Add guard.` |
| `caveman-compress` | `/caveman:compress <file>` | Compresses `.md` files to caveman prose. ~46% fewer input tokens. |
| `caveman-help` | `/caveman-help` | Quick reference card for all caveman commands |

**From [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills):**

| Skill | What it does |
|-------|-------------|
| `andrej-karpathy` | Behavioral guidelines: think before coding, simplicity first, surgical changes, goal-driven execution |

### Root Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Andrej Karpathy coding guidelines — auto-loaded by Claude Code on every session |
| `UPDATE_SYSTEM.md` | Page ID system, versioning format, and update tracking documentation |
| `skills-lock.json` | Version-pinned skill hashes |

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `CURSOR_AUTOMATION_PROMPT.md` | Cursor automation prompt for bug report workflows |
| `CURSOR_AUTOMATION_PROMPT_FEATURES.md` | Cursor automation prompt for feature request workflows |
| `PWA_UPDATE_SYSTEM.md` | PWA auto-update architecture and implementation |
| `PWA_UPDATE_QUICKSTART.md` | Quick start guide for PWA update deployment |

## Getting Started

### 1. Configure Supabase MCP

Edit `.cursor/rules/supabase-mcp.mdc` and replace `YOUR_PROJECT_ID` with your Supabase project ID:

```
Project ID: your-actual-project-id
Project URL: https://your-actual-project-id.supabase.co
```

### 2. Update Page IDs

Edit `UPDATE_SYSTEM.md` to reflect your app's actual page structure. Update the Page ID Reference tables to match your routes.

### 3. Customize Best Practices

Edit `.cursor/rules/best-practices.mdc` to:
- Update the technology stack section for your specific stack
- Remove or replace brew-events specific database table names
- Add your own project-specific coding conventions

### 4. Use the Update Workflow

The versioned update system lets you track features and fixes with IDs like `1.A.T6.1`:

```
Fix 1.A.T6.1          → AI implements the update
Update 1.A.T6.1 complete → AI marks it done (only after you confirm)
```

Generate update instruction documents with:
```
Generate update 1.B instructions based on: [your feedback here]
```

## Update ID Format

```
MAJOR.MINOR.PAGE_ID.UPDATE_NUMBER
```

- `1.A.T1.1` — Version 1, Update A, Tab 1, Update 1
- `1.A.M6.3.M` — Same, but requires a database migration (`.M` suffix)
- `1.A.SYSTEM.7` — System-wide change

## Caveman Mode

All AI responses use caveman mode by default (drops filler words, ~75% fewer tokens):

```
/caveman ultra    → maximum compression
/caveman lite     → light compression, keeps sentences
stop caveman      → back to normal
```

## Skills Lock

`skills-lock.json` pins skill versions. To update skills, pull the latest versions from their source repos and update the hashes.

---

Sources:
- Caveman skills: [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
- Karpathy guidelines: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)
