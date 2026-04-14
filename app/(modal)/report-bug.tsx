/**
 * Report Bug modal — in-app bug reporting
 * Saves to bug_reports table and optionally triggers Slack notification
 * via the trigger-cursor-agent edge function.
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

type Severity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#27AE60' },
  { value: 'medium', label: 'Medium', color: '#F39C12' },
  { value: 'high', label: 'High', color: '#E67E22' },
  { value: 'critical', label: 'Critical', color: '#E74C3C' },
];

export default function ReportBugScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { userProfile, userRole } = useAuth();
  const params = useLocalSearchParams<{ pageId?: string; pageUrl?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title required' });
      return;
    }
    if (!description.trim()) {
      Toast.show({ type: 'error', text1: 'Description required' });
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = Platform.OS === 'web'
        ? { platform: 'web', userAgent: navigator.userAgent, screen: `${window.screen.width}x${window.screen.height}` }
        : { platform: Platform.OS, version: Platform.Version };

      const { error } = await supabase.from('bug_reports').insert({
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce.trim() || null,
        expected_behavior: expectedBehavior.trim() || null,
        actual_behavior: actualBehavior.trim() || null,
        severity,
        page_id: params.pageId ?? null,
        page_url: params.pageUrl ?? null,
        reporter_id: userProfile?.id ?? null,
        reporter_role: userRole ?? null,
        device_info: deviceInfo,
        status: 'open',
      });

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Bug reported', text2: 'Thank you — the team has been notified.' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to submit', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  const s = makeStyles(theme);

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PageIdDisplay pageId={PAGE_IDS.REPORT_BUG} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Report a Bug</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>TITLE *</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief summary of the issue"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Severity */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>SEVERITY</Text>
        <View style={s.severityRow}>
          {SEVERITY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.severityChip,
                { borderColor: severity === opt.value ? opt.color : theme.colors.border },
                severity === opt.value && { backgroundColor: opt.color + '22' },
              ]}
              onPress={() => setSeverity(opt.value)}
            >
              <Text style={[s.severityText, { color: severity === opt.value ? opt.color : theme.colors.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>DESCRIPTION *</Text>
        <TextInput
          style={[s.textarea, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What went wrong?"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Steps to reproduce */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>STEPS TO REPRODUCE</Text>
        <TextInput
          style={[s.textarea, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={stepsToReproduce}
          onChangeText={setStepsToReproduce}
          placeholder="1. Go to...\n2. Tap on...\n3. Observe..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Expected vs actual */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>EXPECTED BEHAVIOR</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={expectedBehavior}
          onChangeText={setExpectedBehavior}
          placeholder="What should have happened?"
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[s.label, { color: theme.colors.textSecondary }]}>ACTUAL BEHAVIOR</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={actualBehavior}
          onChangeText={setActualBehavior}
          placeholder="What actually happened?"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Auto-info note */}
        <Text style={[s.note, { color: theme.colors.textMuted }]}>
          Device info and your account will be attached automatically.
        </Text>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: theme.colors.error ?? '#E74C3C' }, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="bug-outline" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Submit Bug Report</Text>
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
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 18,
    },
    textarea: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      minHeight: 90,
      marginBottom: 18,
    },
    severityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
    severityChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    severityText: { fontSize: 13, fontWeight: '600' },
    note: { fontSize: 12, marginBottom: 20, fontStyle: 'italic' },
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
