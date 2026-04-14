# Time Index Setup Prompt

Run this prompt in Cursor **after** `APP_SETUP_PROMPT.md` completes, if PRD.md Section 3 = "time".

---

## Prompt to paste in Cursor:

```
You are scaffolding a time-indexed app using the base-app framework.
You have already completed the general APP_SETUP_PROMPT.md steps.
Now configure the time-index layer based on PRD.md.

## Step 1: Read PRD.md sections

Re-read these sections:
- Section 4: Core Entity (name, plural, fields)
- Section 6: Editable Enum Categories  
- Section 7: Tab Structure (which time views are needed)

## Step 2: Generate entity migration

Create `database/migrations/004_[entity_name]_table.sql` with:

- Table: use entity plural name from PRD.md (e.g. `events`, `classes`, `shows`)
- Columns: map each field from PRD.md Section 4 to a SQL column type
  - text → TEXT
  - number → NUMERIC or INTEGER
  - datetime → TIMESTAMPTZ
  - boolean → BOOLEAN
  - enum (category_name) → TEXT with a FK or CHECK noting category comes from editable_enums
  - image → TEXT (URL)
  - url → TEXT
- Always include: id UUID PK, created_at, updated_at, created_by UUID FK → auth.users
- Add RLS policies consistent with database/migrations/003_rls_policies.sql:
  - Authenticated users can read
  - Manager/admin can insert, update, delete
  - Add full-text search index on searchable fields from PRD.md Section 4

## Step 3: Configure time-index components

Update `src/components/time-index/` components with entity-specific props:

For each component (DayView, WeekView, MonthView):
- Set `tableName` default to entity table name
- Set `timeColumn` to the datetime field from PRD.md
- Update `defaultTransform` to map DB columns to TimeIndexedEvent fields:
  - `title`: map to the entity's display name field
  - `startTime`: map to datetime column
  - Add any display fields the EventTile should show

For EventForm:
- Replace generic fields with entity fields from PRD.md Section 4
- Set `enumCategories` default to enum category names from PRD.md Section 6
- Update form field labels and placeholder text

For EventTile:
- Update displayed fields to match entity (title, time, tags from enum categories)
- Replace "Event" terminology with entity name from PRD.md

## Step 4: Scaffold tab screens

For each time view checked in PRD.md Section 7, create a tab screen:

**Today/Day View** (if checked):
- Create `app/(tabs)/today.tsx` (or `day.tsx`)
- Import DayView from time-index
- Pass entity-specific props
- Add to TAB_CONFIG in `app/(tabs)/_layout.tsx`

**Week View** (if checked):
- Create `app/(tabs)/week.tsx`
- Import WeekView, pass entity-specific props
- Add to TAB_CONFIG

**Month View** (if checked):
- Create `app/(tabs)/month.tsx`  
- Import MonthView, pass entity-specific props
- Add to TAB_CONFIG

**Search** (if checked):
- Create `app/(tabs)/search.tsx`
- Full-text search across entity table (use Supabase text search on indexed columns)
- Show EventTile results

## Step 5: Update TAB_CONFIG in _layout.tsx

Replace the placeholder TAB_CONFIG with real tabs from PRD.md Section 7.
Assign Page IDs to new tab screens and add them to UPDATE_SYSTEM.md.
Remove SetupBanner once tabs are configured.

## Step 6: Seed enum data

Update `database/migrations/002_editable_enums.sql`:
- Replace the generic example seed data with categories from PRD.md Section 6
- Use actual category names and example values from PRD.md

## Step 7: Update home screen

Replace the placeholder `app/(tabs)/home.tsx` with the primary tab content.
If the app's main tab is a time view, redirect or alias home to it.
Remove the `[BASE-APP SETUP NEEDED]` setup notice card.

## Step 8: Add event form modal

Create `app/(modal)/add-[entity].tsx` with EventForm component:
- Entity-specific field configuration
- Success handler that refreshes the relevant time view
- Add route to `app/(modal)/_layout.tsx`

## Step 9: Output entity-specific checklist

After scaffolding, output:
- SQL for migration 004 (paste into Supabase SQL Editor)
- Enum seed data to insert
- Any fields that need manual implementation (image upload, geolocation, etc.)
```

---

## Expected Output After Running This Prompt

| File | What Changes |
|------|-------------|
| `database/migrations/004_[entity].sql` | New entity table + RLS |
| `database/migrations/002_editable_enums.sql` | Updated seed data |
| `src/components/time-index/*.tsx` | Entity-specific props/field names |
| `app/(tabs)/today.tsx` (or day/week/month) | Wired time views |
| `app/(tabs)/_layout.tsx` | Real TAB_CONFIG, no SetupBanner |
| `app/(tabs)/home.tsx` | Real home content |
| `app/(modal)/add-[entity].tsx` | Entity create form |
| `UPDATE_SYSTEM.md` | Complete page ID table |
