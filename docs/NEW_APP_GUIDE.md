# New App Setup Guide

This guide covers the steps to go from zero to a running custom application built on base-app.

> **Recommended path: use the Setup Wizard.** It automates Steps 1–4 and generates a pre-filled `master-prompt.md` that the AI uses to complete the remaining setup autonomously.

---

## Path A — Setup Wizard (recommended)

### Prerequisites

- [Cursor](https://cursor.com) installed
- A [Supabase](https://supabase.com) account (free tier works)
- A [Resend](https://resend.com) account or SMTP credentials

### Step 1: Download and run the Setup Wizard

Go to the [GitHub Releases page](https://github.com/youruser/base-app/releases) and download the binary for your platform:

| Platform | File |
|----------|------|
| Windows | `Base-App Setup Wizard Setup *.exe` |
| macOS | `*.dmg` |
| Linux | `*.AppImage` |

Double-click to run. No Node.js or npm required.

### Step 2: Fill in the 10-step wizard

The wizard opens a native desktop window with a sidebar showing your progress:

| Step | What you fill in |
|------|-----------------|
| 1 · App Identity | Name, slug, tagline, description, URL |
| 2 · Branding | Logo upload, 7 color fields (palette, name, or hex picker) |
| 3 · Data Model | Core entity + fields — import from CSV/Excel or paste |
| 4 · Roles | Display names for 3 access tiers |
| 5 · Enum Categories | Dropdown/tag categories (auto-populated from data import) |
| 6 · Tab Structure | Index type (time / location / custom) + tab selection |
| 7 · Email | From address and sender name |
| 8 · Supabase | Project ID, anon key, service role key + connection test |
| 9 · Email Provider | Resend API key or custom SMTP |
| 10 · Deployment | Hosting platform and domain |

Step 11 is a review screen. Click **Generate App** to proceed.

### Step 3: What the wizard generates

On submit, the wizard:
1. Writes `PRD.md` with all your inputs
2. Writes `.env` with all credentials
3. Generates `master-prompt.md` — pre-filled with every value, ready for the AI
4. Generates app icons at 512, 192, 180, and 32px from your uploaded logo
5. Highlights `master-prompt.md` in your file explorer and attempts to open Cursor

### Step 4: Run the AI setup in Cursor

Right-click `master-prompt.md` → **Open With → Cursor**.

Open a new Agent chat (`Cmd/Ctrl+L` → switch to **Agent** mode). Paste the file contents into the chat.

The AI executes all setup steps autonomously:
- Configures `appConfig.ts`, `theme.ts`, `app.json`, `manifest.json`
- Updates role labels and permission matrix
- Applies all database migrations via Supabase MCP
- Generates TypeScript types from your live schema
- Scaffolds entity table and tab screens (for time-indexed apps)
- Removes all `[BASE-APP SETUP NEEDED]` placeholders
- Writes `SETUP_TODO.md` with the remaining manual steps

### Step 5: Complete SETUP_TODO.md

Open `SETUP_TODO.md` — it lists only what the AI cannot do (~15–30 minutes):

1. **Configure SMTP** — Supabase Dashboard → Authentication → SMTP Settings
2. **Create first admin** — Invite yourself → set `role = admin` in Table Editor
3. **Verify icons** — Check `assets/pwa-icons/` and update `app.json` if needed
4. **Deploy** — Connect to Netlify/Vercel, add env vars, push

### Step 6: Run the app

```bash
npm install
npm start
```

Open `http://localhost:8081`. Sign in with your admin account. The **Setup Checklist** tab tracks any remaining items and auto-detects when they're done.

---

## Path B — Manual setup

### Prerequisites

- Node.js 18+
- Cursor IDE
- A [Supabase](https://supabase.com) account (free tier works)
- A [Resend](https://resend.com) account for email (or any SMTP provider)

---

### Step 1: Clone and create your repo

```bash
git clone https://github.com/youruser/base-app.git my-new-app
cd my-new-app

rm -rf .git
git init
git add .
git commit -m "init: from base-app"

git remote add origin https://github.com/youruser/my-new-app.git
git push -u origin main
```

---

### Step 2: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name, password, and region
3. Wait for project to initialize (~1 minute)
4. In **Settings → API**, copy:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
5. In **Settings → General**, copy the **Project ID** → `SUPABASE_PROJECT_ID`

---

### Step 3: Fill out PRD.md

Open `PRD.md` in the root of the repo. Fill out **every `[REQUIRED]` section**:

1. App Identity — name, slug, tagline, description
2. Branding — colors, font, logo URL
3. Indexing Type — `time` for most data management apps
4. Core Entity — what you're managing (events, classes, etc.) and its fields
5. Roles — your role names and what each can do
6. Editable Enum Categories — your tag/type categories with example values
7. Tab Structure — which views to include
8. Email — from address, sender name
9. Supabase Project — project name
10. Deployment — platform and domain

Save the file. This is your app's specification document.

---

### Step 4: Fill in .env

```bash
cp .env.example .env
```

Open `.env` and fill in:
- All Supabase values (from Step 2)
- SMTP values (from your email provider — Resend recommended)
- `APP_URL` — your deployment URL (or `http://localhost:8081` for now)

Leave Slack/Cursor variables empty if you're not setting up automation yet.

---

## Step 5: Run AI setup

> **If you used the wizard**, open `master-prompt.md` in Cursor instead — skip to Step 5b.

**Step 5a — Manual path:**

Open Cursor and start a new Agent chat (`Cmd/Ctrl+L` → switch to **Agent** mode).

Paste the entire contents of `docs/prompts/APP_SETUP_PROMPT.md` into the chat.

The AI will:
- Read your PRD.md
- Configure app name, colors, roles
- Generate the page ID table
- If indexing = time: run the TIME_INDEX steps automatically

Wait for the AI to complete and output the **manual steps checklist**.

---

**Step 5b — Wizard path:**

Right-click `master-prompt.md` in your file explorer → **Open With → Cursor**.

Open a new Agent chat, paste the file contents. The AI will:
- Configure all app values inlined in the prompt (no re-reading PRD.md needed)
- Apply database migrations via Supabase MCP (no manual SQL required)
- Generate TypeScript types from your live schema
- Scaffold entity table and tab screens
- Write `SETUP_TODO.md` with what remains

---

## Step 6: Complete the manual steps checklist

After AI setup, open `SETUP_TODO.md` (wizard path) or read the AI's output (manual path) for remaining steps:

### Run Database Migrations (manual path only)

The wizard path applies migrations via Supabase MCP automatically. For the manual path, go to **Supabase Dashboard → SQL Editor** and run:
1. `database/migrations/001_user_profiles.sql`
2. `database/migrations/002_editable_enums.sql`
3. `database/migrations/003_rls_policies.sql`
4. `database/migrations/004_[entity].sql` (generated by AI, if time-indexed)

### Configure Email

In **Supabase Dashboard → Authentication → SMTP Settings**:
- Fill in SMTP host, port, user, password using values from `.env`

In **Supabase Dashboard → Authentication → Email Templates**:
- For each template (Confirm, Reset, Invite, Magic Link):
  - Use the branded HTML from `docs/EMAIL_BRANDING.md`
  - Customize the title and button text per template type (see `docs/EMAIL_SETUP.md`)

### Upload App Icons

If you used the wizard, icons are already in `assets/pwa-icons/` — verify they look correct.

For manual setup, add your logo and icon files to `assets/pwa-icons/`:
- `icon-192x192.png`
- `icon-512x512.png`
- `apple-touch-icon-180x180.png`
- `favicon.ico`

Update `app.json` and `public/manifest.json` to reference the correct paths.

### Deploy Edge Functions (if using)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase functions deploy send-email
npx supabase functions deploy trigger-cursor-agent
```

Set function secrets in **Supabase Dashboard → Edge Functions → Secrets**.

---

## Step 7: Create your first admin user

The app uses invite-only registration. To create the first admin:

1. Go to **Supabase Dashboard → Authentication → Users → Invite User**
2. Enter the admin email
3. After the user clicks the invite link and sets their password, go to **Table Editor → user_profiles**
4. Find the new row and change `role` to `admin`

---

## Step 8: Run locally

```bash
npm install
npm start
# Open in browser: http://localhost:8081
```

Sign in with your admin account. You should see:
- The configured app name and colors
- Tabs matching your PRD.md tab structure
- Working authentication
- Admin modals for enum and user management

---

## Step 9: Deploy

### Netlify

1. Connect your repo to Netlify
2. Build command: `npm run build:web`
3. Publish directory: `dist`
4. Add all `.env` variables in **Site settings → Environment variables**

### Vercel

1. Import your repo
2. Framework preset: Other
3. Build command: `npm run build:web`
4. Output directory: `dist`
5. Add env vars in **Settings → Environment Variables**

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "EXPO_PUBLIC_SUPABASE_URL is required" | Check `.env` exists and is filled |
| Login fails silently | Check Supabase RLS — user_profiles row must exist |
| Enums not loading | Check user is authenticated; check editable_enums RLS |
| PWA not installing | Must be served from HTTPS; check manifest.json is accessible |
| Session expires immediately | Check Supabase JWT expiry settings |

For more help, see `docs/FRAMEWORK_OVERVIEW.md` for architecture context.
