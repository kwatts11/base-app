/**
 * EventForm — create/edit form for time-indexed entities
 *
 * react-hook-form wired. Supabase insert/update wired. Styling is placeholder.
 * TODO: [BASE-APP SETUP NEEDED] Replace field names and enum categories from PRD.md
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../context/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { EnumPicker } from './EnumPicker';
import { TimeIndexedEvent } from './EventTile';

interface EventFormData {
  // WIZARD:BEGIN default-fields
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  tags: string[];
  // WIZARD:END default-fields
}

interface Props {
  /** Existing event to edit, or undefined for create mode */
  event?: TimeIndexedEvent;
  /** Table name to insert/update */
  tableName?: string;
  /** Called on successful save */
  onSuccess?: (event: TimeIndexedEvent) => void;
  /** Called on cancel */
  onCancel?: () => void;
  /** Enum categories to show — from PRD.md editable enum categories */
  enumCategories?: string[];
}

export function EventForm({
  event,
  // WIZARD:BEGIN default-table
  tableName = 'events',
  // WIZARD:END default-table
  onSuccess,
  onCancel,
  // WIZARD:BEGIN default-enums
  enumCategories = [],
  // WIZARD:END default-enums
}: Props): React.JSX.Element {
  const { theme } = useTheme();
  const isEditing = !!event;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      startTime: event?.startTime ? format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm") : '',
      endTime: event?.endTime ? format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm") : '',
      tags: event?.tags ?? [],
    },
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      // TODO: [BASE-APP SETUP NEEDED] Map form fields to database column names from PRD.md
      const payload = {
        title: data.title,
        description: data.description,
        start_time: data.startTime ? new Date(data.startTime).toISOString() : null,
        end_time: data.endTime ? new Date(data.endTime).toISOString() : null,
        // TODO: Add app-specific field mappings here
      };

      let result;
      if (isEditing && event?.id) {
        const { data: updated, error } = await supabase
          .from(tableName)
          .update(payload)
          .eq('id', event.id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
      } else {
        const { data: created, error } = await supabase
          .from(tableName)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = created;
      }

      Toast.show({ type: 'success', text1: isEditing ? 'Updated' : 'Created' });
      onSuccess?.({
        id: result.id,
        title: result.title ?? result.name ?? 'Untitled',
        startTime: result.start_time,
        endTime: result.end_time,
        tags: data.tags,
        ...result,
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e.message });
    }
  };

  const s = makeStyles(theme);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.content}
    >
      {/* TODO: Apply app branding to form header */}
      <Text style={[s.heading, { color: theme.colors.text }]}>
        {/* TODO: Replace "Event" with entity name from PRD.md */}
        {isEditing ? 'Edit Event' : 'New Event'}
      </Text>

      {/* Title field */}
      {/* TODO: [BASE-APP SETUP NEEDED] Replace label with entity name field from PRD.md */}
      <Text style={[s.label, { color: theme.colors.textSecondary }]}>Title *</Text>
      <Controller
        control={control}
        name="title"
        rules={{ required: 'Title is required' }}
        render={({ field }) => (
          <TextInput
            style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: errors.title ? '#e74c3c' : theme.colors.border }]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Event title"
            placeholderTextColor={theme.colors.textMuted}
          />
        )}
      />
      {errors.title && <Text style={s.error}>{errors.title.message}</Text>}

      {/* Description */}
      <Text style={[s.label, { color: theme.colors.textSecondary }]}>Description</Text>
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextInput
            style={[s.input, s.multiline, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Optional description"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={3}
          />
        )}
      />

      {/* Start time */}
      <Text style={[s.label, { color: theme.colors.textSecondary }]}>Start Time *</Text>
      <Controller
        control={control}
        name="startTime"
        rules={{ required: 'Start time is required' }}
        render={({ field }) => (
          <TextInput
            style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: errors.startTime ? '#e74c3c' : theme.colors.border }]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="YYYY-MM-DDTHH:MM"
            placeholderTextColor={theme.colors.textMuted}
          />
        )}
      />
      {errors.startTime && <Text style={s.error}>{errors.startTime.message}</Text>}

      {/* End time */}
      <Text style={[s.label, { color: theme.colors.textSecondary }]}>End Time</Text>
      <Controller
        control={control}
        name="endTime"
        render={({ field }) => (
          <TextInput
            style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="YYYY-MM-DDTHH:MM"
            placeholderTextColor={theme.colors.textMuted}
          />
        )}
      />

      {/* Enum pickers */}
      {/* TODO: [BASE-APP SETUP NEEDED] Add/remove enum categories from PRD.md */}
      {enumCategories.map(category => (
        <Controller
          key={category}
          control={control}
          name="tags"
          render={({ field }) => (
            <View style={s.enumSection}>
              <EnumPicker
                enumType={category}
                selected={field.value}
                onChange={field.onChange}
                label={category}
              />
            </View>
          )}
        />
      ))}

      {/* Actions */}
      <View style={s.actions}>
        {onCancel && (
          <TouchableOpacity
            style={[s.cancelBtn, { borderColor: theme.colors.border }]}
            onPress={onCancel}
          >
            <Text style={[s.cancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: theme.colors.primary }, isSubmitting && s.disabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>{isEditing ? 'Save Changes' : 'Create'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    heading: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
    },
    multiline: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
    error: { color: '#e74c3c', fontSize: 12, marginTop: 3 },
    enumSection: { marginTop: 14 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
    cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
    cancelText: { fontSize: 15, fontWeight: '500' },
    saveBtn: { flex: 2, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
