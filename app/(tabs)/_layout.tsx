/**
 * Tab navigation layout — role-gated tabs from appConfig
 * AI SETUP: Update TAB_CONFIG to match tabs defined in PRD.md
 *
 * Built-in framework tabs (always present):
 *  - home (placeholder, replaced by AI)
 *  - admin (manager/admin only)
 *  - setup (conditional — hides when all setup items are complete)
 *
 * App-specific tabs are added by APP_SETUP_PROMPT / TIME_INDEX_PROMPT.
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { AuthGuard } from '../../src/components/auth';
import { UserRole } from '../../src/types/database';
import { APP_CONFIG } from '../../src/constants/appConfig';
import { useSetupChecklist } from '../../src/hooks/useSetupChecklist';

// ── Tab configuration ──────────────────────────────────────────────────────
// TODO: [BASE-APP SETUP NEEDED] Replace with your app's actual tabs from PRD.md
// Each tab needs: name (route file), title, icons (focused/unfocused), optional minRole
interface TabConfig {
  name: string;
  title: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
  minRole?: UserRole;
}

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'home',
    title: 'Home',
    iconFocused: 'home',
    iconUnfocused: 'home-outline',
  },
  // TODO: Add tabs from PRD.md — examples:
  // { name: 'today', title: 'Today', iconFocused: 'calendar', iconUnfocused: 'calendar-outline' },
  // { name: 'week', title: 'Week', iconFocused: 'grid', iconUnfocused: 'grid-outline' },
  // { name: 'search', title: 'Search', iconFocused: 'search', iconUnfocused: 'search-outline' },
];

// ── Setup banner — visible until AI setup replaces this ────────────────────
function SetupBanner(): React.JSX.Element {
  return (
    <View style={[styles.banner, { backgroundColor: '#FF6B00' }]}>
      <Text style={styles.bannerText}>
        [BASE-APP SETUP NEEDED] Run APP_SETUP_PROMPT.md to configure tabs and branding
      </Text>
    </View>
  );
}

// ── Tab icon ───────────────────────────────────────────────────────────────
function TabIcon({
  name,
  color,
  size,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
}): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

// ── Badge dot for setup tab ────────────────────────────────────────────────
function SetupTabIcon({
  name,
  color,
  size,
  showBadge,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  showBadge: boolean;
}): React.JSX.Element {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {showBadge && (
        <View style={styles.badgeDot} />
      )}
    </View>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────
export default function TabsLayout(): React.JSX.Element {
  const { theme } = useTheme();
  const { userRole } = useAuth();
  const insets = useSafeAreaInsets();
  const { hasIncomplete, requiredIncomplete, loading: checklistLoading } = useSetupChecklist();

  const isAppSetUp = APP_CONFIG.name !== 'APP_NAME';
  const showSetupTab = !checklistLoading && hasIncomplete;

  const hierarchy: Record<UserRole, number> = {
    [UserRole.Employee]: 1,
    [UserRole.Manager]: 2,
    [UserRole.Admin]: 3,
  };

  const hasMinRole = (minRole?: UserRole) => {
    if (!minRole) return true;
    if (!userRole) return false;
    return (hierarchy[userRole] ?? 0) >= (hierarchy[minRole] ?? 99);
  };

  const isManagerOrAdmin = hasMinRole(UserRole.Manager);

  return (
    <AuthGuard>
      {!isAppSetUp && <SetupBanner />}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: insets.bottom,
          },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {/* App-configured tabs */}
        {TAB_CONFIG.map(tab => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: hasMinRole(tab.minRole) ? undefined : null,
              tabBarIcon: ({ color, size, focused }) => (
                <TabIcon
                  name={focused ? tab.iconFocused : tab.iconUnfocused}
                  color={color}
                  size={size}
                />
              ),
            }}
          />
        ))}

        {/* Admin tab — manager/admin only */}
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            href: isManagerOrAdmin ? undefined : null,
            tabBarIcon: ({ color, size, focused }) => (
              <TabIcon
                name={focused ? 'settings' : 'settings-outline'}
                color={color}
                size={size}
              />
            ),
          }}
        />

        {/* Setup Checklist tab — conditional, hides when all items done */}
        <Tabs.Screen
          name="setup"
          options={{
            title: 'Setup',
            href: showSetupTab ? undefined : null,
            tabBarIcon: ({ color, size, focused }) => (
              <SetupTabIcon
                name={focused ? 'construct' : 'construct-outline'}
                color={color}
                size={size}
                showBadge={requiredIncomplete}
              />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },
});
