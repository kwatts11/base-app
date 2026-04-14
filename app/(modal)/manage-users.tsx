/**
 * Manage Users modal — admin screen for viewing and managing user accounts
 * Generic implementation adapted from brew-events
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { AdminGuard } from '../../src/components/auth';
import { supabase } from '../../src/lib/supabase';
import { UserRole, UserProfileRow } from '../../src/types/database';
import { ROLE_LABELS } from '../../src/utils/rolePermissions';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function ManageUsersScreen(): React.JSX.Element {
  return (
    <AdminGuard>
      <ManageUsersContent />
    </AdminGuard>
  );
}

function ManageUsersContent(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { userProfile: currentUserProfile } = useAuth();

  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name');
      if (error) throw error;
      setUsers(data ?? []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to load users', text2: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = useCallback(
    async (userId: string, newRole: UserRole) => {
      if (userId === currentUserProfile?.id) {
        Alert.alert('Cannot change your own role');
        return;
      }
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ role: newRole })
          .eq('id', userId);
        if (error) throw error;
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
        Toast.show({ type: 'success', text1: 'Role updated' });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Update failed', text2: e.message });
      }
    },
    [currentUserProfile?.id]
  );

  const handleToggleActive = useCallback(
    async (userId: string, currentActive: boolean) => {
      if (userId === currentUserProfile?.id) {
        Alert.alert('Cannot deactivate your own account');
        return;
      }
      const action = currentActive ? 'deactivate' : 'activate';
      Alert.alert(`${action.charAt(0).toUpperCase() + action.slice(1)} user`, `Are you sure?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: currentActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_profiles')
                .update({ active: !currentActive })
                .eq('id', userId);
              if (error) throw error;
              setUsers(prev => prev.map(u => (u.id === userId ? { ...u, active: !currentActive } : u)));
              Toast.show({ type: 'success', text1: `User ${action}d` });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Failed', text2: e.message });
            }
          },
        },
      ]);
    },
    [currentUserProfile?.id]
  );

  const handleInvite = useCallback(() => {
    router.push('/(modal)/invite-user');
  }, [router]);

  const s = makeStyles(theme);
  const roles = Object.values(UserRole);

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <PageIdDisplay pageId={PAGE_IDS.MANAGE_USERS} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Manage Users</Text>
        <TouchableOpacity
          style={[s.inviteBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleInvite}
        >
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={s.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView>
          {users.map(user => (
            <View
              key={user.id}
              style={[s.userCard, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}
            >
              <View style={s.userInfo}>
                <View style={s.nameRow}>
                  <Text style={[s.userName, { color: theme.colors.text }]}>{user.name}</Text>
                  {!user.active && (
                    <View style={[s.badge, { backgroundColor: theme.colors.error ?? '#e74c3c' }]}>
                      <Text style={s.badgeText}>Inactive</Text>
                    </View>
                  )}
                  {user.id === currentUserProfile?.id && (
                    <View style={[s.badge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={s.badgeText}>You</Text>
                    </View>
                  )}
                </View>
                <Text style={[s.userEmail, { color: theme.colors.textSecondary }]}>
                  {user.username}
                </Text>
              </View>

              <View style={s.actions}>
                {/* Role selector */}
                <View style={s.roleRow}>
                  {roles.map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        s.roleChip,
                        { borderColor: user.role === role ? theme.colors.primary : theme.colors.border },
                        user.role === role && { backgroundColor: theme.colors.primary + '22' },
                      ]}
                      onPress={() => handleRoleChange(user.id, role)}
                    >
                      <Text
                        style={[
                          s.roleChipText,
                          { color: user.role === role ? theme.colors.primary : theme.colors.textSecondary },
                        ]}
                      >
                        {ROLE_LABELS[role] ?? role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Active toggle */}
                <TouchableOpacity
                  style={s.activeToggle}
                  onPress={() => handleToggleActive(user.id, user.active)}
                >
                  <Text style={[s.activeToggleText, { color: user.active ? theme.colors.error ?? '#e74c3c' : theme.colors.primary }]}>
                    {user.active ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    closeBtn: { padding: 2 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
    inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    userCard: {
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 10,
    },
    userInfo: {},
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    userName: { fontSize: 16, fontWeight: '600' },
    userEmail: { fontSize: 13, marginTop: 2 },
    badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    actions: { gap: 8 },
    roleRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    roleChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    roleChipText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
    activeToggle: { alignSelf: 'flex-start' },
    activeToggleText: { fontSize: 13, fontWeight: '500' },
  });
