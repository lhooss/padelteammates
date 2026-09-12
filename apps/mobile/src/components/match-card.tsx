import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Court, type CourtPlayer } from './court';
import { ScoreSummary } from './score-summary';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { Match, MatchStatus, Team } from '@/api/types';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { teamInScore } from '@/lib/matches';
import { visibilityTag } from '@/lib/visibility';

// Carte de match : heure et club, puis le terrain vu du dessus avec les joueurs
// dans leurs carres de service (places libres en pointilles), puis le score s'il existe.
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
  const [start, end] = match.slot.split('-');
  const when = [showDate ? capitalize(formatDay(match.date)) : null, highlight ? 'Vous jouez' : null]
    .filter(Boolean)
    .join(' · ');
  // Reservation du terrain (tant que le match est planifie) et visibilite si elle
  // n'est pas publique : deux informations breves, sur une seule ligne.
  const tags = [
    match.status === 'PLANNED' ? (match.courtBookedAt ? 'Terrain réservé' : 'Terrain à réserver') : null,
    visibilityTag(match),
  ]
    .filter(Boolean)
    .join(' · ');
  const team = (t: Team): CourtPlayer[] =>
    match.participants
      .filter((p) => p.team === t)
      .map((p) => ({
        key: p.id,
        name: p.user.name,
        userId: p.userId,
        isMe: p.userId === meId,
        invited: p.presenceStatus === 'INVITED',
      }));

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.start, { color: theme.text }]}>{start}</Text>
          <ThemedText type="small" themeColor="textSecondary">
            → {end}
          </ThemedText>
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {match.club.name}
          </ThemedText>
          {when ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {when}
            </ThemedText>
          ) : null}
          {tags ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {tags}
            </ThemedText>
          ) : null}
        </View>
        <StatusPill status={match.status} />
      </View>

      <Court teams={{ A: team('A'), B: team('B') }} />

      {match.score ? (
        <ScoreSummary score={match.score} myTeam={meId ? teamInScore(match.score, meId) : undefined} />
      ) : null}

      {children}
    </ThemedView>
  );
}

function StatusPill({ status }: { status: MatchStatus }) {
  const theme = useTheme();
  const look = {
    PLANNED: { label: 'Planifié', backgroundColor: theme.backgroundSelected, color: theme.primary },
    PENDING: { label: 'Score à valider', backgroundColor: theme.ball, color: theme.onBall },
    COMPLETED: { label: 'Terminé', backgroundColor: theme.background, color: theme.textSecondary },
  }[status];

  return (
    <View style={[styles.pill, { backgroundColor: look.backgroundColor }]}>
      <Text style={[styles.pillText, { color: look.color }]}>{look.label}</Text>
    </View>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  start: {
    fontFamily: FontFamily.display,
    fontSize: 30,
    lineHeight: 30,
  },
  headerText: {
    flex: 1,
  },
  pill: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
