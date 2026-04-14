/**
 * Forgot password screen — sends password reset email via Supabase
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await resetPassword(email.trim().toLowerCase());
      if (result.success) setSent(true);
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
        <PageIdDisplay pageId={PAGE_IDS.FORGOT_PASSWORD} />

        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[s.title, { color: theme.colors.text }]}>Reset Password</Text>

        {sent ? (
          <View style={s.successBox}>
            <Ionicons name="checkmark-circle" size={48} color={theme.colors.primary} />
            <Text style={[s.successTitle, { color: theme.colors.text }]}>Check your email</Text>
            <Text style={[s.successBody, { color: theme.colors.textSecondary }]}>
              We sent a password reset link to {email}. Follow the link to set a new password.
            </Text>
            <TouchableOpacity
              style={[s.button, { backgroundColor: theme.colors.primary, marginTop: 24 }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={s.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
            <Text style={[s.body, { color: theme.colors.textSecondary }]}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            <Text style={[s.label, { color: theme.colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={[s.button, { backgroundColor: theme.colors.primary }, isSubmitting && s.disabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Send Reset Link</Text>
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
    scroll: { flexGrow: 1, padding: 24 },
    back: { marginBottom: 16, alignSelf: 'flex-start' },
    title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
    body: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
    form: {},
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 20,
    },
    button: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    successBox: { alignItems: 'center', paddingTop: 40 },
    successTitle: { fontSize: 22, fontWeight: '700', marginTop: 16 },
    successBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  });
