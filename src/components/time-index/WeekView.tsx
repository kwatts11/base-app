/**
 * WeekView — 7-day strip with event count indicators per day
 *
 * Data fetch wired. Day-strip navigation wired. Visual styling is placeholder.
 * TODO: [BASE-APP SETUP NEEDED] Apply app branding and replace generic entity names
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, isToday, isSameDay } from 'date-fns';

import { useTheme } from '../../context/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { EventTile, TimeIndexedEvent } from './EventTile';

interface Props {
  tableName?: string;
  timeColumn?: string;
  selectColumns?: string;
  transformRow?: (row: any) => TimeIndexedEvent;
  onEventPress?: (event: TimeIndexedEvent) => void;
}

export function WeekView({
  // TODO: [BASE-APP SETUP NEEDED] — AI sets these from PRD.md
  tableName = 'events',
  timeColumn = 'start_time',
  selectColumns = '*',
  transformRow = defaultTransform,
  onEventPress,
}: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState<TimeIndexedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), selectedDay));

  const fetchWeek = useCallback(
    async (start: Date) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(selectColumns)
          .gte(timeColumn, start.toISOString())
          .lte(timeColumn, endOfWeek(start, { weekStartsOn: 0 }).toISOString())
          .order(timeColumn, { ascending: true });

        if (error) throw error;
        setEvents((data ?? []).map(transformRow));
      } catch (e) {
        console.warn('[WeekView] Fetch error:', e);
      } finally {
        setLoading(false);
      }
    },
    [tableName, timeColumn, selectColumns, transformRow]
  );

  useEffect(() => {
    fetchWeek(weekStart);
  }, [weekStart, fetchWeek]);

  const prevWeek = () => {
    const prev = subWeeks(weekStart, 1);
    setWeekStart(prev);
    setSelectedDay(prev);
  };
  const nextWeek = () => {
    const next = addWeeks(weekStart, 1);
    setWeekStart(next);
    setSelectedDay(next);
  };

  const s = makeStyles(theme);

  const countForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.startTime), day)).length;

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* TODO: Apply app branding to week header */}
      <View style={[s.weekHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={prevWeek} style={s.navBtn}>
          <Text style={[s.navText, { color: theme.colors.primary }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[s.weekLabel, { color: theme.colors.text }]}>
          {format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 0 }), 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity onPress={nextWeek} style={s.navBtn}>
          <Text style={[s.navText, { color: theme.colors.primary }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day strip */}
      <View style={[s.dayStrip, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {weekDays.map(day => {
          const count = countForDay(day);
          const selected = isSameDay(day, selectedDay);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[s.dayCell, selected && { backgroundColor: theme.colors.primary + '22' }]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[s.dayLabel, { color: isToday(day) ? theme.colors.primary : theme.colors.textSecondary }]}>
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[
                  s.dayNum,
                  { color: selected ? theme.colors.primary : theme.colors.text },
                  isToday(day) && s.todayDot,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {count > 0 && (
                <View style={[s.dot, { backgroundColor: theme.colors.primary }]}>
                  <Text style={s.dotText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Event list for selected day */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {dayEvents.length === 0 ? (
            <Text style={[s.empty, { color: theme.colors.textMuted }]}>
              {/* TODO: [BASE-APP SETUP NEEDED] Replace "events" */}
              No events on {format(selectedDay, 'EEE, MMM d')}
            </Text>
          ) : (
            dayEvents.map(event => (
              <EventTile key={event.id} event={event} onPress={onEventPress} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function defaultTransform(row: any): TimeIndexedEvent {
  return {
    id: row.id,
    title: row.title ?? row.name ?? 'Untitled',
    startTime: row.start_time,
    endTime: row.end_time,
    tags: [],
    ...row,
  };
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    weekHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    navBtn: { padding: 8 },
    navText: { fontSize: 18, fontWeight: '700' },
    weekLabel: { fontSize: 14, fontWeight: '600' },
    dayStrip: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      gap: 2,
    },
    dayLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    dayNum: { fontSize: 16, fontWeight: '700' },
    todayDot: { textDecorationLine: 'underline' },
    dot: {
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    dotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingVertical: 8 },
    empty: { textAlign: 'center', paddingTop: 40, fontSize: 14 },
  });
