import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScoreSummary } from './score-summary';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { Match, MatchStatus, Participant } from '@/api/types';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { teamInScore } from '@/lib/matches';

const STATUS: Record<MatchStatus, { label: string; color: ThemeColor }> = {
  PLANNED: { label: 'Planifié', color: 'primary' },
  PENDING: { label: 'Score à valider', color: 'warning' },
  COMPLETED: { label: 'Terminé', color: 'textSecondary' },
};

export function MatchCard({
  match,
  meId,
  showDate = true,
  highlight = false,
  children,
}: {
  match: Match;
  meId?: string;
  showDate?: boolean;
  highlight?: boolean; // matchs ou je joue, dans le calendrier global
  children?: ReactNode;
}) {
  const theme = useTheme();
  const status = STATUS[match.status];
  const when = showDate ? `${formatDay(match.date)} · ${match.slot}` : match.slot;

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, highlight && { borderColor: theme.primary, borderWidth: 1.5 }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">{match.club.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {when}
            {highlight ? ' · Vous jouez' : ''}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor={status.color}>
          {status.label}
        </ThemedText>
      </View>

      <View style={styles.teams}>
        <TeamColumn label="Équipe A" players={match.participants.filter((p) => p.team === 'A')} meId={meId} />
        <ThemedText type="smallBold" themeColor="textSecondary">
          vs
        </ThemedText>
        <TeamColumn
          label="Équipe B"
          players={match.participants.filter((p) => p.team === 'B')}
          meId={meId}
          alignEnd
        />
      </View>

      {match.score ? (
        <ScoreSummary score={match.score} myTeam={meId ? teamInScore(match.score, meId) : undefined} />
      ) : null}

      {children}
    </ThemedView>
  );
}

function TeamColumn({
  label,
  players,
  meId,
  alignEnd = false,
}: {
  label: string;
  players: Participant[];
  meId?: string;
  alignEnd?: boolean;
}) {
  return (
    <View style={[styles.team, alignEnd && styles.alignEnd]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {players.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          À compléter
        </ThemedText>
      ) : (
        players.map((p) => <PlayerName key={p.id} participant={p} meId={meId} />)
      )}
    </View>
  );
}

// Nom d'un joueur : ouvre son profil (sauf pour soi-meme).
function PlayerName({ participant, meId }: { participant: Participant; meId?: string }) {
  const color = participant.presenceStatus === 'CONFIRMED' ? 'text' : 'textSecondary';
  const suffix = participant.presenceStatus === 'INVITED' ? ' (invité)' : '';

  if (participant.userId === meId) {
    return (
      <ThemedText type="small" themeColor={color}>
        Vous{suffix}
      </ThemedText>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={6}
      onPress={() => router.push({ pathname: '/players/[id]', params: { id: participant.userId } })}>
      <ThemedText type="small" themeColor={color} style={styles.link}>
        {participant.user.name}
        {suffix}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  team: {
    flex: 1,
    gap: Spacing.half,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
