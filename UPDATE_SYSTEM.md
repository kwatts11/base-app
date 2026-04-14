# App Update System

## Overview

This document describes the comprehensive update tracking system for app development. The system provides structured version management, page identification, and granular update tracking for development and maintenance purposes.

## Version Format

The system uses a hierarchical versioning format:

```
MAJOR.MINOR.PAGE_ID.UPDATE_NUMBER
```

### Examples

- `1.A.T1.1` - Version 1, Update A, Tab 1 (Today page), Update 1
- `1.B.M6.3` - Version 1, Update B, Modal 6 (Event Detail), Update 3
- `2.A.A2.1` - Version 2, Update A, Auth 2 (Login page), Update 1

## Version Components

### Major Version (Numeric)

- Represents significant app releases
- Increments for major feature additions or breaking changes
- Current: `1`

### Minor Version (Alphabetic)

- Represents feature updates within a major version
- Uses letters: A, B, C, D, etc.
- Current: `A`

### Page ID (Alphanumeric)

- Unique identifier for each app page
- Format: `[Category][Number]`
- Categories:
  - **T**: Tab pages (T1, T2, T3, etc.)
  - **A**: Auth pages (A1, A2, A3, etc.)
  - **M**: Modal pages (M1, M2, M3, etc.)
  - **R**: Root pages (R1, R2, R3, etc.)

### Update Number (Numeric)

- Sequential number for updates within a page
- Starts at 1 for each page
- Increments for each new update to that page

## Page ID Reference

### Tab Pages (T)


| ID  | Page        | File Path                |
| --- | ----------- | ------------------------ |
| T0  | Tabs Layout | `app/(tabs)/_layout.tsx` |
| T1  | Tab 1       | `app/(tabs)/tab1.tsx`    |
| T2  | Tab 2       | `app/(tabs)/tab2.tsx`    |
| T3  | Tab 3       | `app/(tabs)/tab3.tsx`    |


### Auth Pages (A)


| ID  | Page            | File Path                        |
| --- | --------------- | -------------------------------- |
| A0  | Auth Layout     | `app/(auth)/_layout.tsx`         |
| A1  | Auth Index      | `app/(auth)/index.tsx`           |
| A2  | Login           | `app/(auth)/login.tsx`           |
| A3  | Forgot Password | `app/(auth)/forgot-password.tsx` |


### Modal Pages (M)


| ID  | Page    | File Path                |
| --- | ------- | ------------------------ |
| M1  | Modal 1 | `app/(modal)/modal1.tsx` |
| M2  | Modal 2 | `app/(modal)/modal2.tsx` |


### Root Pages (R)


| ID  | Page        | File Path         |
| --- | ----------- | ----------------- |
| R1  | Root Index  | `app/index.tsx`   |
| R2  | Root Layout | `app/_layout.tsx` |


## Development vs Production

### Development Builds

- Page IDs are visible on each page via the `PageIdDisplay` component
- Displayed in a small overlay (default: top-right corner)
- Shows both the page ID and human-readable page name
- Controlled by `VERSION_CONFIG.showPageIds` (automatically set to `__DEV__`)

### Production Builds

- Page IDs are hidden from users
- `VERSION_CONFIG.showPageIds` is automatically `false` in production
- No visual impact on the user interface

## Implementation Files

### Core Files

- `src/constants/version.ts` - Version configuration and page ID mapping
- `src/components/common/PageIdDisplay.tsx` - Development page ID display component
- `src/hooks/useUpdateTracking.ts` - Update management hook

### Key Functions

- `generateUpdateId(pageId, updateNumber)` - Creates full update ID
- `parseUpdateId(updateId)` - Parses update ID into components
- `getPageName(pageId)` - Gets human-readable page name

## Usage Examples

### Adding Page ID Display to a Page

```tsx
import { PageIdDisplay } from '../src/components/common/PageIdDisplay';
import { PAGE_IDS } from '../src/constants/version';

export default function TodayScreen() {
  return (
    <View>
      <PageIdDisplay pageId={PAGE_IDS.TODAY} />
      {/* Rest of your component */}
    </View>
  );
}
```

### Using Update Tracking Hook

```tsx
import { useUpdateTracking } from '../src/hooks/useUpdateTracking';
import { PAGE_IDS } from '../src/constants/version';

function UpdateManager() {
  const { addUpdate, updateStatus, getUpdatesForPage } = useUpdateTracking();

  // Add a new update
  const handleAddUpdate = () => {
    addUpdate(PAGE_IDS.TODAY, 1, 'Add event filtering functionality');
  };

  // Mark update as completed
  const handleCompleteUpdate = () => {
    updateStatus('1.A.T1.1', 'completed');
  };

  return (
    // Your component JSX
  );
}
```

### Creating Update IDs

```typescript
import { generateUpdateId, PAGE_IDS } from '../src/constants/version';

// Generate update ID for Today page, update #1
const updateId = generateUpdateId(PAGE_IDS.TODAY, 1);
// Result: "1.A.T1.1"
```

## Update Status Types

Updates can have the following statuses:

- `planned` - Update is planned but not started
- `in_progress` - Update is currently being worked on
- `completed` - Update has been implemented and tested
- `cancelled` - Update was cancelled and will not be implemented

## Best Practices

### For Developers

1. **Always add PageIdDisplay** to new pages during development
2. **Use descriptive update descriptions** that clearly explain what was changed
3. **Update status promptly** when work begins and completes
4. **Group related changes** under the same update when appropriate
5. **Document breaking changes** clearly in update descriptions

### For Project Management

1. **Plan updates in batches** using the minor version system
2. **Track progress** using the status system
3. **Export update data** regularly for reporting
4. **Use page IDs** for clear communication about specific pages

### For AI Assistance

1. **Reference page IDs** when discussing specific pages
2. **Use update IDs** when tracking implementation progress
3. **Include page context** when requesting changes
4. **Verify page ID mapping** when working with new pages

## Migration Guide

### From Existing Codebase

1. Add `PageIdDisplay` components to existing pages
2. Import version constants where needed
3. Update build configuration if necessary
4. Test development vs production visibility

### Adding New Pages

1. Add new page ID to `PAGE_IDS` constant
2. Update `getPageName` function with human-readable name
3. Add `PageIdDisplay` component to the new page
4. Update this documentation with the new page reference

## Troubleshooting

### Page IDs Not Showing

- Verify `__DEV__` is true in development mode
- Check that `PageIdDisplay` component is properly imported and used
- Ensure the page ID exists in the `PAGE_IDS` constant

### Update Tracking Issues

- Verify update IDs are properly formatted
- Check that page IDs match the constants
- Ensure update numbers are sequential for each page

### Build Issues

- Confirm version constants are properly imported
- Check TypeScript types are correctly defined
- Verify no circular dependencies exist

## Future Enhancements

Potential improvements to the system:

- Automated update ID generation in development tools
- Integration with git commit messages
- Update progress dashboard
- Automated changelog generation
- Integration with project management tools

---

*This system ensures clear tracking of all changes while maintaining clean production builds and providing excellent developer experience.*