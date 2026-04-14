/**
 * Login screen — email + password sign-in
 */
import React, { useState, useRef } from 'react';
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
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { APP_CONFIG } from '../../src/constants/appConfig';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function LoginScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { signIn, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.success) {
        router.replace('/(tabs)/home');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = makeStyles(theme);
  const isLoading = loading || isSubmitting;

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <PageIdDisplay pageId={PAGE_IDS.LOGIN} />

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.appName, { color: theme.colors.primary }]}>{APP_CONFIG.name}</Text>
          <Text style={[s.tagline, { color: theme.colors.textSecondary }]}>
            {APP_CONFIG.tagline}
          </Text>
        </View>

        {/* Form */}
        <View style={s.form}>
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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={[s.label, { color: theme.colors.textSecondary }]}>Password</Text>
          <View style={s.passwordRow}>
            <TextInput
              ref={passwordRef}
              style={[s.input, s.passwordInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={s.eyeButton}
              onPress={() => setShowPassword(v => !v)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={s.forgotRow}>
              <Text style={[s.forgotText, { color: theme.colors.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={[s.button, { backgroundColor: theme.colors.primary }, isLoading && s.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    appName: { fontSize: 32, fontWeight: '700', letterSpacing: 1 },
    tagline: { fontSize: 14, marginTop: 8, textAlign: 'center' },
    form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    passwordRow: { position: 'relative' },
    passwordInput: { paddingRight: 46 },
    eyeButton: {
      position: 'absolute',
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    forgotRow: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 24 },
    forgotText: { fontSize: 13, fontWeight: '500' },
    button: {
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
