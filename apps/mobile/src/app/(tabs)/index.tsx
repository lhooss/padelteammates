import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import type { Match } from '@/api/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { JoinMatchActions } from '@/components/join-match-actions';
import { MatchCard } from '@/components/match-card';
import { NotificationBell } from '@/components/notification-bell';
import { QueryState } from '@/components/query-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { addDays, formatDay, formatWeek, mondayOf, toIsoDay } from '@/lib/dates';
import { isParticipant } from '@/lib/matches';
import { useClubsQuery, useMeQuery, useWeeklyCalendarQuery } from '@/store/api';

// Calendrier global de la communaute, semaine par semaine (lundi -> dimanche), filtrable
// par club. On peut y demander a rejoindre un match qui a des places libres.
export default function CalendarScreen() {
  const theme = useTheme();
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [clubId, setClubId] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching, error, refetch } = useWeeklyCalendarQuery({ from: toIsoDay(monday), clubId });
  const { data: me } = useMeQuery();
  const { data: clubs } = useClubsQuery();

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle" style={styles.title}>
          Calendrier
        </ThemedText>
        <Button title="Planifier" style={styles.planButton} onPress={() => router.push('/match/new')} />
        <NotificationBell />
      </View>
      <View style={styles.weekSwitcher}>
        <WeekArrow label="‹" hint="Semaine précédente" onPress={() => setMonday(addDays(monday, -7))} />
        <Text style={[styles.weekLabel, { color: theme.text }]}>{formatWeek(monday)}</Text>
        <WeekArrow label="›" hint="Semaine suivante" onPress={() => setMonday(addDays(monday, 7))} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubs}>
        <Chip label="Tous les clubs" selected={!clubId} onPress={() => setClubId(undefined)} />
        {clubs?.map((club) => (
          <Chip key={club.id} label={club.name} selected={clubId === club.id} onPress={() => setClubId(club.id)} />
        ))}
      </ScrollView>
    </View>
  );

  if (!data) {
    return (
      <Screen>
        {header}
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionList
        sections={groupByDay(data)}
        keyExtractor={(match) => match.id}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.dayTitle}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <MatchCard match={item} meId={me?.id} showDate={false} highlight={isParticipant(item, me?.id)}>
            {me ? <JoinMatchActions match={item} meId={me.id} /> : null}
          </MatchCard>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {clubId ? 'Aucun match dans ce club cette semaine.' : 'Aucun match programmé cette semaine.'}
          </ThemedText>
        }
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

function WeekArrow({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.arrowText, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

function groupByDay(matches: Match[]): { title: string; data: Match[] }[] {
  const sections: { title: string; data: Match[] }[] = [];
  for (const match of matches) {
    const title = formatDay(match.date);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(match);
    else sections.push({ title, data: [match] });
  }
  return sections;
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  planButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  weekSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.display,
    fontSize: 22,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 26,
  },
  clubs: {
    gap: Spacing.two,
  },
  dayTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  separator: {
    height: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
