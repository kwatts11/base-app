# Update System — {{APP_NAME}}

Generated: {{GENERATED_DATE}}

## Page IDs

Each screen embeds its page ID in a small badge so you can ask "what's on T4?" and get a deterministic answer.

{{PAGE_ID_TABLE}}

## How to add a new page

1. Pick the next free `T<n>` (or `M<n>` for modal).
2. Add the entry to `PAGE_IDS` and `PAGE_NAMES` in `src/constants/version.ts`.
3. Render `<PageIdDisplay pageId={PAGE_IDS.YOUR_PAGE} />` near the top of the screen.
4. Append a row to the table above.
