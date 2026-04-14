/**
 * Accept invite screen — handles invitation links, lets user set a password
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../src/context/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { APP_CONFIG } from '../../src/constants/appConfig';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function AcceptInviteScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve current session (Supabase auto-parses invite hash from URL)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const handleAccept = async (): Promise<void> => {
    if (!password || !confirm) {
      Alert.alert('Error', 'Please fill in both fields');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setDone(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = makeStyles(theme);

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <PageIdDisplay pageId={PAGE_IDS.ACCEPT_INVITE} />

        <Text style={[s.appName, { color: theme.colors.primary }]}>{APP_CONFIG.name}</Text>
        <Text style={[s.title, { color: theme.colors.text }]}>Welcome!</Text>
        {userEmail && (
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            Setting up account for {userEmail}
          </Text>
        )}

        {done ? (
          <View style={s.successBox}>
            <Text style={[s.successTitle, { color: theme.colors.text }]}>Account ready!</Text>
            <Text style={[s.successBody, { color: theme.colors.textSecondary }]}>
              Your account has been set up. Sign in to get started.
            </Text>
            <TouchableOpacity
              style={[s.button, { backgroundColor: theme.colors.primary, marginTop: 24 }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={s.buttonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Choose a Password</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
            />

            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Confirm Password</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleAccept}
            />

            <TouchableOpacity
              style={[s.button, { backgroundColor: theme.colors.primary, marginTop: 8 }, isSubmitting && s.disabled]}
              onPress={handleAccept}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
    appName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    title: { fontSize: 26, fontWeight: '700' },
    subtitle: { fontSize: 14, marginTop: 4, marginBottom: 24 },
    form: {},
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 4,
    },
    button: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    disabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    successBox: { alignItems: 'center', paddingTop: 40 },
    successTitle: { fontSize: 22, fontWeight: '700', marginTop: 16 },
    successBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  });
