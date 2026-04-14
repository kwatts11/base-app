/**
 * App theme — colors and typography
 * TODO: [BASE-APP SETUP NEEDED] — AI replaces placeholder colors with brand colors from PRD.md
 */

export interface AppTheme {
  colors: {
    /** Primary brand color — buttons, active states, accents */
    primary: string;
    /** Secondary brand color — supporting elements */
    secondary: string;
    /** Accent color — badges, tags, highlights */
    accent: string;
    /** Page background */
    background: string;
    /** Card / panel surface */
    surface: string;
    /** Input field background */
    inputBackground: string;
    /** Primary text */
    text: string;
    /** Secondary / muted text */
    textSecondary: string;
    /** Very muted text, placeholders */
    textMuted: string;
    /** Border / divider color */
    border: string;
    /** Success state */
    success: string;
    /** Warning state */
    warning: string;
    /** Error state */
    error: string;
  };
  /** Font sizes */
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  /** Border radii */
  radius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  /** Spacing scale */
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

/**
 * Default theme — placeholder dark palette
 * Replace hex values with brand colors from PRD.md during AI setup
 */
export const DEFAULT_THEME: AppTheme = {
  colors: {
    // TODO: Replace with PRD.md brand colors
    primary: '#4F8EF7',
    secondary: '#2C3E50',
    accent: '#E74C3C',
    background: '#0F1115',
    surface: '#1A1E25',
    inputBackground: '#22272F',
    text: '#F0F0F0',
    textSecondary: '#9AA3B0',
    textMuted: '#5A6270',
    border: '#2A2F3A',
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 14,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
  },
};
