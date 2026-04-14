/**
 * App configuration constants
 * TODO: [BASE-APP SETUP NEEDED] — AI fills these from PRD.md during APP_SETUP_PROMPT
 */

export const APP_CONFIG = {
  /** App display name */
  name: 'APP_NAME',
  /** Short version for tab bars, notifications */
  shortName: 'APP_NAME',
  /** One-line tagline */
  tagline: 'Your app tagline here.',
  /** Longer description shown in onboarding/about */
  description: 'A brief description of what this app does.',
  /** Contact / support email */
  supportEmail: 'support@yourdomain.com',
  /** App version (keep in sync with package.json) */
  version: '1.0.0',
} as const;

export type AppConfig = typeof APP_CONFIG;
