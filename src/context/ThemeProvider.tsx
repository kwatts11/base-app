/**
 * Theme provider — wraps the app with a consistent theme object
 */
import React, { createContext, useContext, useMemo } from 'react';
import { DEFAULT_THEME, AppTheme } from '../constants/theme';

interface ThemeContextValue {
  theme: AppTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useMemo(() => ({ theme: DEFAULT_THEME }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
