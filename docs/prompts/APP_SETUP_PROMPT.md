# App Setup Prompt

**PRD-driven — no interactive Q&A required.**

Paste this prompt into Cursor after:
1. Filling out `PRD.md` completely
2. Copying `.env.example` → `.env` and filling in all keys

---

## Prompt to paste in Cursor:

```
You are setting up a new application based on the base-app framework.
Follow these instructions exactly and autonomously. Do not ask questions
unless a value is completely missing from PRD.md.

## Step 1: Read source documents

1. Read `PRD.md` in full — this is your source of truth for all app-specific values.
2. Read `.env.example` to see which integrations have keys configured.
3. Note the indexing type (Section 3 of PRD.md). For time-indexed apps, you will
   also run the TIME_INDEX_PROMPT.md after this prompt.

## Step 2: App identity and configuration

Update these files using values from PRD.md Section 1 (App Identity):

- `src/constants/appConfig.ts` — set: name, shortName, tagline, description, supportEmail
- `app.json` — set: expo.name, expo.slug, expo.web.name, expo.web.shortName,
  expo.web.meta["apple-mobile-web-app-title"]
- `public/manifest.json` — set: name, short_name, description

## Step 3: Branding and theme

Using PRD.md Section 2 (Branding):

- `src/constants/theme.ts` — update DEFAULT_THEME.colors:
  - primary, secondary, accent, background, surface, text, textSecondary
  - Keep error/success/warning unless PRD.md overrides
- `app.json` — update: expo.splash.backgroundColor, expo.web.themeColor,
  expo.web.backgroundColor, expo.android.adaptiveIcon.backgroundColor
- `public/manifest.json` — update: background_color, theme_color

## Step 4: Roles

Using PRD.md Section 5 (Roles):

- `src/types/database.ts` — rename UserRole enum values to match PRD.md
  (keep 'employee', 'manager', 'admin' as DB values unless user specified different names
   — if they specified DB-level names, update the SQL migration too)
- `src/utils/rolePermissions.ts` — update ROLE_LABELS to use PRD.md role names
- `database/migrations/001_user_profiles.sql` — if role DB values changed, update ENUM definition

## Step 5: Page ID table

Update `UPDATE_SYSTEM.md` — add a page ID table for the app's final route structure:

| Page ID | Route | Description |
|---------|-------|-------------|
| R1 | / | Root redirect |
| A1 | /(auth)/login | Login screen |
| A2 | /(auth)/forgot-password | Forgot password |
| A3 | /(auth)/reset-password | Reset password |
| A4 | /(auth)/accept-invite | Accept invite |
| T1 | /(tabs)/home | Home / main tab |
| M1 | /(modal)/edit-enums | Edit enum values |
| M2 | /(modal)/manage-users | Manage users |
| [Add rows for any tabs from PRD.md Section 7] | | |

## Step 6: Supabase MCP configuration

- `.cursor/rules/supabase-mcp.mdc` — fill in the Supabase project ID from PRD.md Section 9

## Step 7: Email branding

Using PRD.md Section 8 (Email):

- `docs/EMAIL_BRANDING.md` — replace template placeholders:
  - `{{APP_NAME}}` → app name
  - `{{PRIMARY_COLOR}}` → primary color hex
  - `{{BACKGROUND_COLOR}}` → background color hex
  - `{{SUPPORT_EMAIL}}` → support email from PRD.md

## Step 8: Manifest shortcuts (optional)

If PRD.md Section 12 (PWA Settings) lists App Shortcuts, add them to `public/manifest.json`
in the "shortcuts" array.

## Step 9: Remove setup banners

Replace all `[BASE-APP SETUP NEEDED]` placeholders:
- `app/(tabs)/_layout.tsx` — remove SetupBanner component after configuring real tabs
- `app/(tabs)/home.tsx` — replace placeholder content with real home screen content
- Any other files with `// TODO: [BASE-APP SETUP NEEDED]` comments

## Step 10: Indexing-specific setup

- If PRD.md Section 3 = "time": Read and execute `docs/prompts/TIME_INDEX_PROMPT.md`
- If PRD.md Section 3 = "location": Note — location index not yet implemented.
  Scaffold placeholder screens and add a TODO comment.

## Step 11: Output setup checklist

After completing all automated steps, output a checklist of manual steps the developer
must still complete. Include:
- [ ] Run database migrations (paste 001, 002, 003, 004 SQL into Supabase SQL Editor in order)
- [ ] Configure Supabase SMTP in Dashboard → Authentication → SMTP Settings
  (values: from PRD.md + .env SMTP_* variables)
- [ ] Update Supabase auth email templates (copy template from docs/EMAIL_BRANDING.md,
  customize per template type in docs/EMAIL_SETUP.md)
- [ ] Upload app logo/icon to assets/pwa-icons/ and update app.json + manifest.json paths
- [ ] If Slack integration configured: Create Slack app, add bot to channels
  (see docs/CURSOR_AUTOMATION_PROMPT.md)
- [ ] Deploy to [platform from PRD.md] and connect custom domain
- [ ] Add all .env values to hosting platform environment variables
- [ ] Run: npm install && npm start — verify app runs
```

---

## What the AI Does Automatically

| Task | File(s) Modified |
|------|-----------------|
| App name/tagline/description | appConfig.ts, app.json, manifest.json |
| Brand colors | theme.ts, app.json, manifest.json |
| Role names | database.ts, rolePermissions.ts, migrations/001 |
| Supabase project ID | supabase-mcp.mdc |
| Email branding template | EMAIL_BRANDING.md |
| Page ID table | UPDATE_SYSTEM.md |
| Setup banner removal | _layout.tsx, home.tsx |
| Time-index scaffold (if time) | Via TIME_INDEX_PROMPT.md |

## What Humans Do Manually

| Task | Where |
|------|-------|
| Run SQL migrations | Supabase Dashboard → SQL Editor |
| Configure SMTP | Supabase Dashboard → Authentication → SMTP |
| Customize email templates | Supabase Dashboard → Authentication → Email Templates |
| Upload logo/icons | assets/pwa-icons/ |
| Set up Slack app | slack.com/apps → Your Apps |
| Deploy | Netlify/Vercel |
| Set env vars | Hosting platform dashboard |
