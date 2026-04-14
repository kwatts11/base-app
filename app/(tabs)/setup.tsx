/**
 * Setup Checklist screen
 *
 * Conditionally visible tab — shows when setup items are still incomplete.
 * Disappears automatically once all required items are done.
 * Each item expands to show step-by-step instructions.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/context/ThemeProvider';
import { useSetupChecklist, SETUP_ITEMS, SetupItem, SetupStep } from '../../src/hooks/useSetupChecklist';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Step detail component ─────────────────────────────────────────────────────
function StepCard({ step, index, theme }: { step: SetupStep; index: number; theme: any }): React.JSX.Element {
  return (
    <View style={[stepStyles.card, { backgroundColor: theme.colors.background, borderLeftColor: theme.colors.primary }]}>
      <View style={stepStyles.numberBadge}>
        <Text style={[stepStyles.number, { color: theme.colors.primary }]}>{index + 1}</Text>
      </View>
      <View style={stepStyles.content}>
        <Text style={[stepStyles.heading, { color: theme.colors.text }]}>{step.heading}</Text>
        <Text style={[stepStyles.body, { color: theme.colors.textSecondary }]}>{step.body}</Text>
        {step.code && (
          <View style={[stepStyles.codeBlock, { backgroundColor: theme.colors.background }]}>
            <Text style={[stepStyles.code, { color: theme.colors.primary }]}>{step.code}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Checklist item component ──────────────────────────────────────────────────
function ChecklistItem({
  item,
  completed,
  autoDetected,
  onToggle,
  theme,
}: {
  item: SetupItem;
  completed: boolean;
  autoDetected: boolean;
  onToggle: () => void;
  theme: any;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  };

  const handleToggle = useCallback(() => {
    if (!autoDetected) onToggle();
  }, [autoDetected, onToggle]);

  const s = makeItemStyles(theme);

  return (
    <View style={[s.container, { backgroundColor: theme.colors.surface, borderColor: completed ? theme.colors.primary + '40' : theme.colors.border }]}>
      {/* Header row */}
      <TouchableOpacity style={s.header} onPress={handlePress} activeOpacity={0.7}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[s.checkbox, { borderColor: completed ? theme.colors.primary : theme.colors.border, backgroundColor: completed ? theme.colors.primary : 'transparent' }]}
          onPress={handleToggle}
          disabled={autoDetected}
        >
          {completed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </TouchableOpacity>

        {/* Title + badges */}
        <View style={s.titleCol}>
          <View style={s.titleRow}>
            <Text style={[s.title, { color: completed ? theme.colors.textSecondary : theme.colors.text }, completed && s.titleDone]}>
              {item.title}
            </Text>
            {item.category === 'optional' && (
              <View style={[s.badge, { backgroundColor: theme.colors.border }]}>
                <Text style={[s.badgeText, { color: theme.colors.textMuted }]}>Optional</Text>
              </View>
            )}
            {autoDetected && (
              <View style={[s.badge, { backgroundColor: theme.colors.primary + '22' }]}>
                <Text style={[s.badgeText, { color: theme.colors.primary }]}>Auto</Text>
              </View>
            )}
          </View>
          <Text style={[s.desc, { color: theme.colors.textMuted }]} numberOfLines={expanded ? undefined : 2}>
            {item.description}
          </Text>
        </View>

        {/* Expand chevron */}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textMuted}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {/* Expanded step-by-step */}
      {expanded && (
        <View style={s.steps}>
          <Text style={[s.stepsLabel, { color: theme.colors.textSecondary }]}>HOW TO COMPLETE</Text>
          {item.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} theme={theme} />
          ))}

          {/* Manual complete button (for non-auto items) */}
          {!autoDetected && !completed && (
            <TouchableOpacity
              style={[s.doneBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => { handleToggle(); handlePress(); }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={s.doneBtnText}>Mark as Complete</Text>
            </TouchableOpacity>
          )}
          {!autoDetected && completed && (
            <TouchableOpacity style={[s.undoBtn, { borderColor: theme.colors.border }]} onPress={handleToggle}>
              <Text style={[s.undoBtnText, { color: theme.colors.textMuted }]}>Undo</Text>
            </TouchableOpacity>
          )}
          {autoDetected && completed && (
            <View style={[s.autoComplete, { backgroundColor: theme.colors.primary + '15' }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
              <Text style={[s.autoCompleteText, { color: theme.colors.primary }]}>
                Automatically detected as complete
              </Text>
            </View>
          )}
          {autoDetected && !completed && (
            <View style={[s.autoComplete, { backgroundColor: theme.colors.warning + '15' }]}>
              <Ionicons name="time-outline" size={16} color={theme.colors.warning ?? '#F39C12'} />
              <Text style={[s.autoCompleteText, { color: theme.colors.warning ?? '#F39C12' }]}>
                Will auto-detect when complete
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SetupScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const {
    items,
    itemStates,
    completedCount,
    totalCount,
    requiredCompleted,
    allCompleted,
    isCompleted,
    toggleComplete,
  } = useSetupChecklist();

  const requiredItems = items.filter(i => i.category === 'required');
  const optionalItems = items.filter(i => i.category === 'optional');
  const requiredCompletedCount = requiredItems.filter(i => isCompleted(i.id)).length;

  const s = makeStyles(theme);
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <ScrollView style={[s.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={s.content}>
      <PageIdDisplay pageId={PAGE_IDS.SETUP} />

      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: theme.colors.text }]}>Setup Checklist</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
          Complete these steps to get your app production-ready.
        </Text>

        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[s.progressFill, { width: `${progressPct}%` as any, backgroundColor: allCompleted ? theme.colors.success : theme.colors.primary }]} />
        </View>
        <Text style={[s.progressLabel, { color: theme.colors.textSecondary }]}>
          {completedCount} / {totalCount} complete
          {requiredCompleted && !allCompleted ? '  ·  Required items done ✓' : ''}
        </Text>

        {allCompleted && (
          <View style={[s.allDoneBanner, { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success + '40' }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[s.allDoneTitle, { color: theme.colors.success }]}>All setup complete!</Text>
              <Text style={[s.allDoneBody, { color: theme.colors.textSecondary }]}>
                This tab will disappear the next time you restart the app.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Required items */}
      <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>
        REQUIRED  ·  {requiredCompletedCount}/{requiredItems.length}
      </Text>
      {requiredItems.map(item => {
        const state = itemStates.find(s => s.id === item.id)!;
        return (
          <ChecklistItem
            key={item.id}
            item={item}
            completed={state.completed}
            autoDetected={state.autoDetected}
            onToggle={() => toggleComplete(item.id)}
            theme={theme}
          />
        );
      })}

      {/* Optional items */}
      <Text style={[s.sectionLabel, { color: theme.colors.textSecondary, marginTop: 20 }]}>
        OPTIONAL
      </Text>
      {optionalItems.map(item => {
        const state = itemStates.find(s => s.id === item.id)!;
        return (
          <ChecklistItem
            key={item.id}
            item={item}
            completed={state.completed}
            autoDetected={state.autoDetected}
            onToggle={() => toggleComplete(item.id)}
            theme={theme}
          />
        );
      })}

      <Text style={[s.footer, { color: theme.colors.textMuted }]}>
        Auto-detected items update when you reload the app. Manual items are saved locally.
      </Text>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    header: { marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
    subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: 6, borderRadius: 3 },
    progressLabel: { fontSize: 12, marginBottom: 12 },
    allDoneBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginTop: 8,
    },
    allDoneTitle: { fontSize: 15, fontWeight: '700' },
    allDoneBody: { fontSize: 12, marginTop: 2 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    footer: { fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
  });

const makeItemStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 10,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 1,
      flexShrink: 0,
    },
    titleCol: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
    title: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
    titleDone: { textDecorationLine: 'line-through' },
    desc: { fontSize: 12, lineHeight: 17 },
    badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    steps: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
    stepsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 8,
      paddingVertical: 10,
      marginTop: 8,
    },
    doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    undoBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 8 },
    undoBtnText: { fontSize: 13 },
    autoComplete: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10, marginTop: 8 },
    autoCompleteText: { fontSize: 13, fontWeight: '500' },
  });

const stepStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 6,
  },
  numberBadge: { width: 20, alignItems: 'center', paddingTop: 1 },
  number: { fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  heading: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  body: { fontSize: 13, lineHeight: 18 },
  codeBlock: { borderRadius: 6, padding: 10, marginTop: 8 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
});
