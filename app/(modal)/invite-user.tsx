/**
 * Invite User modal — admin screen for sending user invitations
 * Calls the invite-user edge function which uses Supabase admin API
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../src/context/ThemeProvider';
import { AdminGuard } from '../../src/components/auth';
import { supabase } from '../../src/lib/supabase';
import { UserRole } from '../../src/types/database';
import { ROLE_LABELS } from '../../src/utils/rolePermissions';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function InviteUserScreen(): React.JSX.Element {
  return (
    <AdminGuard>
      <InviteUserContent />
    </AdminGuard>
  );
}

function InviteUserContent(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Employee);
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      Toast.show({ type: 'error', text1: 'Email required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Toast.show({ type: 'error', text1: 'Invalid email address' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: trimmedEmail, name: trimmedName || undefined, role: selectedRole },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      Toast.show({
        type: 'success',
        text1: 'Invitation sent',
        text2: `${trimmedEmail} will receive an invite email`,
      });
      router.back();
    } catch (e: any) {
      const message = e.message ?? 'Failed to send invitation';
      if (message.includes('not deployed') || message.includes('FunctionsFetchError')) {
        Toast.show({
          type: 'error',
          text1: 'Edge function not deployed',
          text2: 'Deploy invite-user function: npx supabase functions deploy invite-user',
        });
      } else {
        Toast.show({ type: 'error', text1: 'Invite failed', text2: message });
      }
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(theme);
  const roles = Object.values(UserRole);

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PageIdDisplay pageId={PAGE_IDS.INVITE_USER} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Invite User</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {/* Info banner */}
        <View style={[s.infoBanner, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }]}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
          <Text style={[s.infoText, { color: theme.colors.textSecondary }]}>
            The user will receive an email with a link to set their password. The invite-user edge function must be deployed.
          </Text>
        </View>

        {/* Email */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>EMAIL ADDRESS *</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={email}
          onChangeText={setEmail}
          placeholder="user@example.com"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Name */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>DISPLAY NAME</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Optional — user can set this later"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Role selector */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>ROLE</Text>
        <View style={s.roleRow}>
          {roles.map(role => (
            <TouchableOpacity
              key={role}
              style={[
                s.roleChip,
                { borderColor: selectedRole === role ? theme.colors.primary : theme.colors.border },
                selectedRole === role && { backgroundColor: theme.colors.primary + '22' },
              ]}
              onPress={() => setSelectedRole(role)}
            >
              <Text
                style={[
                  s.roleChipText,
                  { color: selectedRole === role ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {ROLE_LABELS[role] ?? role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: theme.colors.primary }, loading && { opacity: 0.6 }]}
          onPress={handleInvite}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Send Invitation</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    form: { padding: 16, gap: 0 },
    infoBanner: {
      flexDirection: 'row',
      gap: 10,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 20,
    },
    roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
    roleChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    roleChipText: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 10,
      paddingVertical: 14,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
