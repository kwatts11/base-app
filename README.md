<div align="center">

# base-app

**A production-ready app framework for Cursor + Expo + Supabase.**

Fill out one document. Run one AI prompt. Ship a complete app.

[![Expo](https://img.shields.io/badge/Expo-53-000020?logo=expo&logoColor=white)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [What's Included](#whats-included) · [Docs](docs/NEW_APP_GUIDE.md)

</div>

---

Every app needs auth, roles, a database, email, and a handful of admin screens before you can write a single line of business logic. `base-app` is that infrastructure, fully wired and tested, sitting on top of Expo and Supabase. Describe your app in `PRD.md`, run the AI setup prompt in Cursor, and the framework configures itself — names, colors, roles, database schema, and tab structure — from your specification.

---

## The Idea

Most app templates give you a starting point and leave the wiring to you. `base-app` is different in three ways:

**Everything is pre-wired.** Auth with invite-only registration, role guards, Row-Level Security, email with branded templates, a PWA service worker, an admin panel, in-app bug reporting — all of it works on day one, before you touch the code.

**The AI does the setup.** A `PRD.md` file captures your app's identity, branding, roles, and data model. An AI prompt reads it and configures the entire codebase — no interactive CLI, no templating engine, no boilerplate to delete. The AI also generates your core entity migration and scaffolds your tabs.

**The framework grows with you.** Each new app you build adds a new index layer back to the framework. The first index type — time (day/week/month views) — came from a real app. The next one will be location. The skeleton is always shared; the index and app layers are always separate.

---

## What's Included

Every app built from `base-app` starts with:

**Authentication**
- [x] Email + password login with session persistence
- [x] Forgot password, reset password, accept invite flows
- [x] Auth guards: `AuthGuard`, `ManagerGuard`, `AdminGuard`
- [x] Session invalidation (remote sign-out)

**Roles & Permissions**
- [x] Three-tier role hierarchy: Employee → Manager → Admin
- [x] Configurable permission matrix per role
- [x] Role-gated tabs, routes, and UI elements

**Database**
- [x] Supabase PostgreSQL with Row-Level Security on every table
- [x] `user_profiles`, `editable_enums`, `bug_reports`, `feature_requests`
- [x] AI generates your core entity table from `PRD.md`

**Admin Panel**
- [x] Manage users: view, change roles, activate/deactivate
- [x] Invite users by email with role pre-assignment
- [x] Manage editable enum values (categories, tags, types)
- [x] Live stats: user count, active enums, open bug reports

**Email**
- [x] Supabase SMTP for auth emails (reset, invite, magic link)
- [x] Custom transactional email edge function (Resend or SMTP)
- [x] Branded HTML email template with placeholders for AI to fill

**PWA**
- [x] Service worker with cache-first and network-first strategies
- [x] Install prompt component
- [x] Update notification and version tracking

**Feedback**
- [x] In-app bug reporting with severity levels and device info
- [x] In-app feature requests with priority levels
- [x] Optional: bug report → Slack → Cursor AI auto-fix pipeline

**Developer Experience**
- [x] Setup Checklist tab — auto-detects progress, disappears when complete
- [x] AI setup prompts: `APP_SETUP_PROMPT.md`, `TIME_INDEX_PROMPT.md`
- [x] Agent skills: caveman, caveman-commit, caveman-review, andrej-karpathy
- [x] Page ID system for update tracking across deploys

---

## Quick Start

**You need:** Node.js 18+, [Cursor](https://cursor.com), a [Supabase](https://supabase.com) account.

**1. Clone into a new project**

```bash
git clone https://github.com/youruser/base-app.git my-app
cd my-app
rm -rf .git && git init && git add . && git commit -m "init"
```

**2. Create a Supabase project and fill in your keys**

```bash
cp .env.example .env
# Paste your Supabase URL, anon key, service_role key, and SMTP credentials into .env
```

**3. Describe your app in `PRD.md`, then run the AI setup**

Open `PRD.md` and fill in the `[REQUIRED]` sections — app name, colors, roles, entity fields, tabs. Then open Cursor, start a new chat, and paste the full contents of `docs/prompts/APP_SETUP_PROMPT.md`.

The AI reads your `PRD.md` and configures everything autonomously. When it finishes, it outputs a short checklist of steps that need a browser (run migrations, configure SMTP, invite first admin).

**4. Run the app**

```bash
npm install
npm start
```

Open `http://localhost:8081`. Sign in with the admin account you created. The **Setup Checklist** tab tracks remaining items and auto-detects when they're done.

> See [`docs/NEW_APP_GUIDE.md`](docs/NEW_APP_GUIDE.md) for the complete walkthrough.

---

## How It Works

`base-app` is three layers stacked on top of each other. All three are committed to the repo.

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3 · App-specific                                 │
│  Your entity, your tabs, your business logic.           │
│  Scaffolded by AI from PRD.md.                          │
├─────────────────────────────────────────────────────────┤
│  Layer 2 · Index                                        │
│  How your entity is browsed. Currently: time            │
│  (DayView, WeekView, MonthView). Location is next.      │
├─────────────────────────────────────────────────────────┤
│  Layer 1 · Skeleton                                     │
│  Auth, roles, DB, email, PWA, admin, feedback.          │
│  Always present. Never changes between apps.            │
└─────────────────────────────────────────────────────────┘
```

The index layer is what makes `base-app` more than a starter kit. Rather than rebuilding the day/week/month browsing pattern for every time-based app, it lives here and gets reused. A new app with a different data pattern (location, list, kanban) adds its index layer back to the framework when it's built.

**Index types:**

| Type | Status | Description |
|---|---|---|
| `time` | Available | Day / Week / Month views. Events, classes, shifts, appointments. |
| `location` | Planned | Map + list views. Venues, check-ins, service areas. |
| `custom` | Open | Define your own browsing pattern. |

---

## Stack

| | |
|---|---|
| UI | [Expo](https://expo.dev) 53 + React Native, web-first via PWA |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) 5, file-system based |
| Backend | [Supabase](https://supabase.com) — Auth, PostgreSQL, Edge Functions (Deno) |
| Forms | [react-hook-form](https://react-hook-form.com) |
| Dates | [date-fns](https://date-fns.org) |
| PWA | Workbox-based service worker |
| Icons | Ionicons via [@expo/vector-icons](https://icons.expo.fyi) |
| IDE | [Cursor](https://cursor.com) with custom rules + agent skills |

---

## Project Structure

```
base-app/
├── PRD.md                          ← Fill this out first. AI reads it during setup.
├── .env.example                    ← Every required key, with instructions inline.
│
├── app/
│   ├── (auth)/                     ← Login, forgot password, reset, accept invite
│   ├── (tabs)/
│   │   ├── home.tsx                ← Replaced by AI during setup
│   │   ├── admin.tsx               ← Admin hub (manager + admin roles)
│   │   └── setup.tsx               ← Setup checklist (hidden when complete)
│   └── (modal)/
│       ├── edit-enums.tsx          ← Manage enum values
│       ├── manage-users.tsx        ← View and edit user accounts
│       ├── invite-user.tsx         ← Send email invitations
│       ├── report-bug.tsx          ← In-app bug reporting
│       └── request-feature.tsx     ← In-app feature requests
│
├── src/
│   ├── lib/supabase.ts             ← Client, auth helpers, session cache
│   ├── types/database.ts           ← TypeScript types for all tables
│   ├── constants/                  ← appConfig, theme, version/pageIds
│   ├── context/                    ← ThemeProvider, EnumProvider (with caching)
│   ├── hooks/                      ← useAuth, useEditableEnums, useSetupChecklist
│   ├── utils/rolePermissions.ts    ← Role hierarchy, permission matrix
│   └── components/
│       ├── auth/                   ← AuthGuard, ManagerGuard, AdminGuard
│       ├── common/                 ← SessionManager, PWA components
│       └── time-index/             ← DayView, WeekView, MonthView, EventForm
│
├── database/migrations/
│   ├── 001_user_profiles.sql
│   ├── 002_editable_enums.sql
│   ├── 003_rls_policies.sql
│   └── 004_feedback.sql            ← bug_reports + feature_requests
│
├── supabase/functions/
│   ├── send-email/                 ← Transactional email (Resend / SMTP)
│   ├── invite-user/                ← Invite via Supabase Auth admin API
│   └── trigger-cursor-agent/       ← Bug report → Slack → AI fix pipeline
│
├── docs/
│   ├── prompts/
│   │   ├── APP_SETUP_PROMPT.md     ← Paste into Cursor to configure your app
│   │   └── TIME_INDEX_PROMPT.md    ← Scaffolds time-indexed entity and tabs
│   ├── NEW_APP_GUIDE.md            ← Full step-by-step setup guide
│   ├── FRAMEWORK_OVERVIEW.md       ← Architecture and layer reference
│   ├── EMAIL_SETUP.md              ← SMTP and template configuration
│   ├── CURSOR_AUTOMATION_PROMPT.md ← Slack + AI bug-fix pipeline setup
│   └── PWA_UPDATE_SYSTEM.md        ← PWA versioning and update workflow
│
└── .agents/ + .cursor/             ← Agent skills and Cursor rules
```

---

## Documentation

| | |
|---|---|
| [New App Guide](docs/NEW_APP_GUIDE.md) | Full walkthrough from clone to deployed app |
| [Framework Overview](docs/FRAMEWORK_OVERVIEW.md) | Architecture, layers, component ownership |
| [Email Setup](docs/EMAIL_SETUP.md) | SMTP configuration and template guide |
| [Cursor Automation](docs/CURSOR_AUTOMATION_PROMPT.md) | Slack + AI bug-fix pipeline |
| [PWA Update System](docs/PWA_UPDATE_SYSTEM.md) | Versioning, update detection, deployment |

---

## License

MIT — see [LICENSE](LICENSE).

<div align="center">
<br />
<sub>Built to stop rebuilding auth for the tenth time.</sub>
</div>
