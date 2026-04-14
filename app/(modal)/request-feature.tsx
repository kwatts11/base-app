/**
 * Request Feature modal — in-app feature request submission
 * Saves to feature_requests table. Admins can view and triage in the admin hub.
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
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

type Priority = 'nice_to_have' | 'important' | 'critical';

const PRIORITY_OPTIONS: { value: Priority; label: string; description: string; color: string }[] = [
  { value: 'nice_to_have', label: 'Nice to Have', description: 'Would improve quality of life', color: '#27AE60' },
  { value: 'important', label: 'Important', description: 'Meaningfully impacts workflow', color: '#F39C12' },
  { value: 'critical', label: 'Critical', description: 'Blocking productivity', color: '#E74C3C' },
];

export default function RequestFeatureScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { userProfile, userRole } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useCase, setUseCase] = useState('');
  const [priority, setPriority] = useState<Priority>('important');
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
      const { error } = await supabase.from('feature_requests').insert({
        title: title.trim(),
        description: description.trim(),
        use_case: useCase.trim() || null,
        priority,
        requester_id: userProfile?.id ?? null,
        requester_role: userRole ?? null,
        status: 'open',
      });

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Feature request submitted',
        text2: 'Thank you — we\'ll review your suggestion.',
      });
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
      <PageIdDisplay pageId={PAGE_IDS.REQUEST_FEATURE} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Request a Feature</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>FEATURE TITLE *</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Short name for the feature"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Priority */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>PRIORITY</Text>
        <View style={s.priorityCol}>
          {PRIORITY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.priorityChip,
                { borderColor: priority === opt.value ? opt.color : theme.colors.border },
                priority === opt.value && { backgroundColor: opt.color + '15' },
              ]}
              onPress={() => setPriority(opt.value)}
            >
              <View style={[s.priorityDot, { backgroundColor: opt.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.priorityLabel, { color: priority === opt.value ? opt.color : theme.colors.text }]}>
                  {opt.label}
                </Text>
                <Text style={[s.priorityDesc, { color: theme.colors.textMuted }]}>{opt.description}</Text>
              </View>
              {priority === opt.value && (
                <Ionicons name="checkmark-circle" size={18} color={opt.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>DESCRIPTION *</Text>
        <TextInput
          style={[s.textarea, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the feature you'd like to see..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Use case */}
        <Text style={[s.label, { color: theme.colors.textSecondary }]}>USE CASE</Text>
        <TextInput
          style={[s.textarea, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={useCase}
          onChangeText={setUseCase}
          placeholder="When would you use this? What problem does it solve?"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: theme.colors.primary }, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="bulb-outline" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Submit Request</Text>
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
    priorityCol: { gap: 8, marginBottom: 18 },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
    },
    priorityDot: { width: 10, height: 10, borderRadius: 5 },
    priorityLabel: { fontSize: 14, fontWeight: '600' },
    priorityDesc: { fontSize: 12, marginTop: 1 },
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
