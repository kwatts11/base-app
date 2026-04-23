/**
 * Home tab — placeholder screen
 * TODO: [BASE-APP SETUP NEEDED]
 * Replace with your app's primary tab content after running APP_SETUP_PROMPT.md
 * For time-indexed apps: use DayView, WeekView, or MonthView from src/components/time-index/
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { APP_CONFIG } from '../../src/constants/appConfig';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function HomeScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { userProfile, userRole, signOut } = useAuth();
  const router = useRouter();

  const s = makeStyles(theme);

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <PageIdDisplay pageId={PAGE_IDS.HOME} />

      {/* WIZARD:BEGIN setup-card */}
      <View style={[s.setupCard, { backgroundColor: '#FF6B00' }]}>
        <Ionicons name="construct" size={20} color="#fff" style={{ marginBottom: 6 }} />
        <Text style={s.setupTitle}>[BASE-APP SETUP NEEDED]</Text>
        <Text style={s.setupBody}>
          This is a placeholder home screen. Run the AI setup prompt (docs/prompts/APP_SETUP_PROMPT.md)
          to replace this with your app's real content.
        </Text>
      </View>
      {/* WIZARD:END setup-card */}

      {/* App info */}
      <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.cardTitle, { color: theme.colors.primary }]}>{APP_CONFIG.name}</Text>
        <Text style={[s.cardBody, { color: theme.colors.textSecondary }]}>{APP_CONFIG.tagline}</Text>
      </View>

      {/* User info */}
      {userProfile && (
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Signed in as</Text>
          <Text style={[s.userName, { color: theme.colors.text }]}>{userProfile.name}</Text>
          <Text style={[s.userRole, { color: theme.colors.primary }]}>{userRole}</Text>
        </View>
      )}

      {/* Quick links */}
      <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Admin</Text>
        <TouchableOpacity
          style={[s.linkRow, { borderBottomColor: theme.colors.border }]}
          onPress={() => router.push('/(modal)/manage-users')}
        >
          <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[s.linkText, { color: theme.colors.text }]}>Manage Users</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.linkRow}
          onPress={() => router.push('/(modal)/edit-enums')}
        >
          <Ionicons name="list-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[s.linkText, { color: theme.colors.text }]}>Edit Enum Values</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[s.signOut, { borderColor: theme.colors.border }]} onPress={signOut}>
        <Text style={[s.signOutText, { color: theme.colors.textSecondary }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    setupCard: {
      margin: 16,
      borderRadius: 10,
      padding: 16,
    },
    setupTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
    setupBody: { color: '#fff', fontSize: 12, lineHeight: 18 },
    card: { margin: 16, marginTop: 0, borderRadius: 10, padding: 16 },
    cardTitle: { fontSize: 20, fontWeight: '700' },
    cardBody: { fontSize: 14, marginTop: 4 },
    sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    userName: { fontSize: 17, fontWeight: '600' },
    userRole: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    linkText: { flex: 1, fontSize: 15 },
    signOut: {
      margin: 16,
      marginTop: 4,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    signOutText: { fontSize: 15, fontWeight: '500' },
  });
