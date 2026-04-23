/**
 * Admin hub tab — central admin panel for managing the application
 * Visible to Manager and Admin roles only
 * TODO: [BASE-APP SETUP NEEDED] — AI adds app-specific admin sections from PRD.md
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { ManagerGuard } from '../../src/components/auth';
import { supabase } from '../../src/lib/supabase';
import { APP_CONFIG } from '../../src/constants/appConfig';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

interface AdminStat {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
}

interface AdminAction {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  adminOnly?: boolean;
  color?: string;
}

const USER_ACTIONS: AdminAction[] = [
  {
    title: 'Manage Users',
    description: 'View, edit roles, and activate/deactivate accounts',
    icon: 'people-outline',
    route: '/(modal)/manage-users',
    adminOnly: true,
  },
  {
    title: 'Invite User',
    description: 'Send an email invitation to a new team member',
    icon: 'person-add-outline',
    route: '/(modal)/invite-user',
    adminOnly: true,
  },
];

const CONFIG_ACTIONS: AdminAction[] = [
  {
    title: 'Edit Enum Values',
    description: 'Manage category and tag options available in the app',
    icon: 'list-outline',
    route: '/(modal)/edit-enums',
    adminOnly: true,
  },
  {
    title: 'Area Colors',
    description: 'Manage map area names and colors',
    icon: 'color-palette-outline',
    route: '/(modal)/area-colors',
    adminOnly: true,
  },
  // TODO: [BASE-APP SETUP NEEDED] — Add app-specific admin config actions from PRD.md
];

const FEEDBACK_ACTIONS: AdminAction[] = [
  {
    title: 'Report a Bug',
    description: 'Submit a bug report to the development team',
    icon: 'bug-outline',
    route: '/(modal)/report-bug',
    color: '#E74C3C',
  },
  {
    title: 'Request a Feature',
    description: 'Suggest a new feature or improvement',
    icon: 'bulb-outline',
    route: '/(modal)/request-feature',
    color: '#F39C12',
  },
];

export default function AdminScreen(): React.JSX.Element {
  return (
    <ManagerGuard>
      <AdminContent />
    </ManagerGuard>
  );
}

function AdminContent(): React.JSX.Element {
  const { theme } = useTheme();
  const { userProfile, userRole, signOut, isAdmin } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStat[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, enumsRes, bugsRes] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('editable_enums').select('id', { count: 'exact', head: true }).eq('active', true),
          supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        ]);

        setStats([
          { label: 'Total Users', value: usersRes.count ?? '—', icon: 'people' },
          { label: 'Active Enums', value: enumsRes.count ?? '—', icon: 'list' },
          { label: 'Open Bugs', value: bugsRes.count ?? '—', icon: 'bug' },
        ]);
      } catch { /* stats are cosmetic */ }
    };

    if (isAdmin) fetchStats();
  }, [isAdmin]);

  const s = makeStyles(theme);

  const renderAction = (action: AdminAction) => {
    if (action.adminOnly && !isAdmin) return null;
    const iconColor = action.color ?? theme.colors.primary;

    return (
      <TouchableOpacity
        key={action.title}
        style={[s.actionRow, { borderBottomColor: theme.colors.border }]}
        onPress={() => router.push(action.route as any)}
        activeOpacity={0.7}
      >
        <View style={[s.iconWrapper, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={action.icon} size={20} color={iconColor} />
        </View>
        <View style={s.actionText}>
          <Text style={[s.actionTitle, { color: theme.colors.text }]}>{action.title}</Text>
          <Text style={[s.actionDesc, { color: theme.colors.textMuted }]}>{action.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <PageIdDisplay pageId={PAGE_IDS.ADMIN} />

      {/* Profile header */}
      <View style={[s.profileCard, { backgroundColor: theme.colors.surface }]}>
        <View style={[s.avatar, { backgroundColor: theme.colors.primary + '22' }]}>
          <Text style={[s.avatarText, { color: theme.colors.primary }]}>
            {(userProfile?.name ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.profileName, { color: theme.colors.text }]}>{userProfile?.name ?? 'Admin'}</Text>
          <Text style={[s.profileRole, { color: theme.colors.primary }]}>
            {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={signOut} style={[s.signOutBtn, { borderColor: theme.colors.border }]}>
          <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats (admin only) */}
      {isAdmin && stats.length > 0 && (
        <View style={[s.statsRow]}>
          {stats.map(stat => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name={stat.icon} size={18} color={theme.colors.primary} style={{ marginBottom: 4 }} />
              <Text style={[s.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* User management */}
      {isAdmin && (
        <View style={[s.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>USERS</Text>
          {USER_ACTIONS.map(renderAction)}
        </View>
      )}

      {/* Configuration */}
      {isAdmin && (
        <View style={[s.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>CONFIGURATION</Text>
          {CONFIG_ACTIONS.map(renderAction)}
        </View>
      )}

      {/* Feedback (available to all admin/manager roles) */}
      <View style={[s.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>FEEDBACK</Text>
        {FEEDBACK_ACTIONS.map(renderAction)}
      </View>

      {/* App info footer */}
      <Text style={[s.versionText, { color: theme.colors.textMuted }]}>
        {APP_CONFIG.name} v{APP_CONFIG.version}
      </Text>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '700' },
    profileName: { fontSize: 16, fontWeight: '700' },
    profileRole: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
    signOutBtn: { borderWidth: 1, borderRadius: 8, padding: 8 },
    statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 0 },
    statCard: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '700' },
    statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
    section: {
      margin: 16,
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconWrapper: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    actionText: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '600' },
    actionDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    versionText: { fontSize: 12, textAlign: 'center', marginVertical: 20 },
  });
