/**
 * Version configuration and page ID system
 * Used for versioned update tracking (see UPDATE_SYSTEM.md)
 * TODO: [BASE-APP SETUP NEEDED] — AI extends PAGE_IDS with app-specific pages from PRD.md
 */

export const VERSION_CONFIG = {
  /** App semantic version */
  version: '1.0.0',
  /** Current update batch letter */
  updateBatch: 'A',
  /** Show page ID overlays in dev, hide in production */
  showPageIds: __DEV__,
} as const;

/**
 * Page ID reference — used in update tracking (MAJOR.MINOR.PAGE_ID.UPDATE_NUMBER)
 * Format: T = Tab, A = Auth, M = Modal, R = Root
 *
 * TODO: [BASE-APP SETUP NEEDED] — AI adds all tab/modal pages from PRD.md
 */
export const PAGE_IDS = {
  // Root
  ROOT_INDEX: 'R1',
  ROOT_LAYOUT: 'R2',

  // Auth
  AUTH_LAYOUT: 'A0',
  LOGIN: 'A1',
  FORGOT_PASSWORD: 'A2',
  RESET_PASSWORD: 'A3',
  ACCEPT_INVITE: 'A4',
  AUTH_REDIRECT: 'A5',

  // Tabs
  TABS_LAYOUT: 'T0',
  HOME: 'T1',
  ADMIN: 'T2',
  SETUP: 'T3',
  // WIZARD:BEGIN app-page-ids
  // WIZARD:END app-page-ids

  // Modals
  MODAL_LAYOUT: 'M0',
  EDIT_ENUMS: 'M1',
  MANAGE_USERS: 'M2',
  INVITE_USER: 'M3',
  REPORT_BUG: 'M4',
  REQUEST_FEATURE: 'M5',
  // Add app-specific modals here
} as const;

export type PageId = (typeof PAGE_IDS)[keyof typeof PAGE_IDS];

/**
 * Human-readable page names for dev overlay
 */
export const PAGE_NAMES: Record<string, string> = {
  R1: 'Root Index',
  R2: 'Root Layout',
  A0: 'Auth Layout',
  A1: 'Login',
  A2: 'Forgot Password',
  A3: 'Reset Password',
  A4: 'Accept Invite',
  A5: 'Auth Redirect',
  T0: 'Tabs Layout',
  T1: 'Home',
  T2: 'Admin',
  T3: 'Setup Checklist',
  // WIZARD:BEGIN app-page-names
  // WIZARD:END app-page-names
  M0: 'Modal Layout',
  M1: 'Edit Enums',
  M2: 'Manage Users',
  M3: 'Invite User',
  M4: 'Report Bug',
  M5: 'Request Feature',
};

export function getPageName(pageId: string): string {
  return PAGE_NAMES[pageId] ?? pageId;
}

export function generateUpdateId(pageId: string, updateNumber: number): string {
  return `${VERSION_CONFIG.version.split('.')[0]}.${VERSION_CONFIG.updateBatch}.${pageId}.${updateNumber}`;
}
