# Product Requirements Document (PRD)

# App Setup Specification

> **How to use this file:**
> Fill out every section below before running the AI setup prompt.
> The AI reads this file to configure your app — the more detail you provide, the less manual work remains.
> Sections marked `[REQUIRED]` must be completed. Sections marked `[OPTIONAL]` can be left blank to use defaults.
>
> Keys and secrets go in `.env` — NOT here. This file can be committed.

---

## 1. App Identity [REQUIRED]

**App Name:** 

**App Slug:** 

**Tagline:** 

**Short Description:** 

**Target Audience:** 

**Production URL:** 

---

## 2. Branding [REQUIRED]

**Primary Color:** 
**Secondary Color:** 
**Accent Color:** 
**Background Color:** 
**Surface Color:** 
**Text Primary:** 
**Text Secondary:** 

**Font Preference:** 

**Logo:**

- Logo URL: 
- Logo Description: 
- Favicon/App Icon Description: 

---

## 3. Indexing Type [REQUIRED]

**Primary Index:** 

**Notes:** 

---

## 4. Core Entity [REQUIRED for time-indexed apps]

> The main "thing" users manage in the app. For a brewery, this is an "Event". For a gym, it might be a "Class". For a concert venue, a "Show".

**Entity Name (singular):** 
**Entity Name (plural):** 

**Fields:**

> List each field. Format: `Field Name | Type | Required | Notes`
> Types: text, number, date, time, datetime, boolean, enum (specify category), image, url


| Field Name  | Type     | Required | Notes |
| ----------- | -------- | -------- | ----- |
| Title       | text     | yes      |       |
| Description | text     | no       |       |
| Start Time  | datetime | yes      |       |
| End Time    | datetime | no       |       |
|             |          |          |       |


**Searchable Fields:** 

**Default Sort:** 

---

## 5. Roles [REQUIRED]

> Default roles are Employee → Manager → Admin. You can rename them or keep defaults.
> List from lowest to highest access level.


| Role (your name) | Maps to default | What they can do                        |
| ---------------- | --------------- | --------------------------------------- |
|                  | Employee        | View events, basic data entry           |
|                  | Manager         | Create/edit/delete events, view reports |
|                  | Admin           | Manage users, edit enums, full access   |


**Default Role for new users:** 

**Invite-only registration:** 

---

## 6. Editable Enum Categories [REQUIRED]

> Enums are admin-managed tag/type categories. Users pick from these lists, admins can add/edit values.


| Category Name | Example Values | Used On                   |
| ------------- | -------------- | ------------------------- |
|               |                | Event form — Type field   |
|               |                | Event form — Status field |
|               |                |                           |


---

## 7. Tab Structure [REQUIRED]

> Check off which tabs to include. The AI will scaffold these from the time-index component library.

**Time-Indexed Views:**

- Today / Day View — scrollable list of events for the current day
- Week View — 7-day strip with events
- Month View — calendar grid with event dots

**Utility Tabs:**

- Search — full-text search across entities
- Add / Create — quick-add form (floating button or tab)
- Reports — summary data, exports
- Admin — user management, enum management (admin only)

**Custom Tabs:** 

---

## 8. Email [REQUIRED]

**From Address:** 
**Sender Name:** 
**Email Tone/Style:** 

**Auth Emails to customize** (Supabase sends these — you provide the branding):

- Welcome / Confirm Email
- Password Reset
- Invite to App
- Magic Link

**Custom Transactional Emails** (sent via edge function — optional):



---

## 9. Supabase Project [REQUIRED]

**Project Name:** 
**Project ID:** 
**Region:** 

> Keys go in `.env` — not here.

---

## 10. Deployment [REQUIRED]

**Hosting Platform:** 
**Custom Domain:** 
**Build Command:** 
**Publish Directory:** 

---

## 11. Slack Automation [OPTIONAL]

> Powers the automated bug fix and feature request pipeline (see docs/CURSOR_AUTOMATION_PROMPT.md).
> Leave blank if not setting up Slack integration now.

**Bug Reports Channel:** 
**Feature Requests Channel:** 
**Workspace Name:** 

---

## 12. PWA Settings [OPTIONAL]

**Display Mode:** 
**App Orientation:** 
**Share Target:** 
**App Shortcuts:** 

---

## 13. Additional Requirements [OPTIONAL]

> Free text — describe anything not covered above. Feature ideas, integrations, constraints, design preferences, data import needs, etc.



---

## 14. AI Setup Checklist

> After filling this document, the AI will complete these automatically.
> Items marked [MANUAL] require human action in an external dashboard.

**Automated (AI handles):**

- Update `src/constants/appConfig.ts` with app name, tagline, description
- Update `app.json` with name, slug, colors, PWA config
- Update `public/manifest.json` with name, colors, icons
- Apply branding colors to `src/constants/theme.ts`
- Configure role names in `src/utils/rolePermissions.ts` and `src/types/database.ts`
- Generate event entity migration SQL
- Scaffold tab pages using time-index components
- Replace all `[BASE-APP SETUP NEEDED]` placeholders
- Update `UPDATE_SYSTEM.md` with final page ID table
- Fill `.cursor/rules/supabase-mcp.mdc` with project ID

**Manual (you do after AI setup):**

- [MANUAL] Run migrations in Supabase SQL editor
- [MANUAL] Configure SMTP in Supabase Dashboard → Authentication → SMTP Settings
- [MANUAL] Update Supabase auth email templates with branding (see docs/EMAIL_BRANDING.md)
- [MANUAL] Create Slack app and install bot (see docs/CURSOR_AUTOMATION_PROMPT.md)
- [MANUAL] Deploy to Netlify/Vercel and connect domain
- [MANUAL] Add all `.env` values to hosting platform environment variables
- [MANUAL] Upload app logo/icon assets

