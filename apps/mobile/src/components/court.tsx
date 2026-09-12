import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Team } from '@/api/types';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CourtPlayer {
  key: string;
  name: string;
  isMe?: boolean;
  invited?: boolean;
  userId?: string; // ouvre le profil du joueur au toucher
}

// Terrain de padel vu du dessus : lignes de service a ~15 % du fond, ligne mediane,
// filet au centre. Chaque equipe a deux carres de service ; une place vide reste en pointilles.
export function Court({ teams }: { teams: Record<Team, CourtPlayer[]> }) {
  const theme = useTheme();
  const line = { backgroundColor: theme.courtLine };

  return (
    <View style={[styles.court, { backgroundColor: theme.court, borderColor: theme.courtLine }]}>
      <View style={[styles.serviceLine, line, { left: '15%' }]} />
      <View style={[styles.serviceLine, line, { right: '15%' }]} />
      <View style={[styles.centerLine, line]} />
      <View style={[styles.net, line]} />

      {(['A', 'B'] as const).map((team) => (
        <View key={`label-${team}`} style={[styles.backZone, team === 'A' ? { left: 0 } : { right: 0 }]}>
          <Text style={styles.teamLetter}>{team}</Text>
        </View>
      ))}
      {(['A', 'B'] as const).map((team) => (
        <View key={team} style={[styles.half, team === 'A' ? { left: '15%', right: '50%' } : { left: '50%', right: '15%' }]}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.slot}>
              <Slot player={teams[team][i]} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Slot({ player }: { player?: CourtPlayer }) {
  const theme = useTheme();

  if (!player) {
    return (
      <View style={styles.freeSpot}>
        <Text style={styles.freeText}>Place libre</Text>
      </View>
    );
  }

  const chip = (
    <View style={[styles.player, player.isMe && { backgroundColor: theme.ball }, player.invited && styles.invited]}>
      <Text numberOfLines={1} style={[styles.playerText, { color: player.isMe ? theme.onBall : '#FFFFFF' }]}>
        {player.isMe ? 'Vous' : shortName(player.name)}
      </Text>
      {player.invited ? <Text style={[styles.invitedTag, player.isMe && { color: theme.onBall }]}>invité</Text> : null}
    </View>
  );

  const userId = player.userId;
  if (player.isMe || !userId) return chip;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Profil de ${player.name}`}
      hitSlop={6}
      onPress={() => router.push({ pathname: '/players/[id]', params: { id: userId } })}>
      {chip}
    </Pressable>
  );
}

// "Youssef Alaoui" -> "Youssef A."
function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length > 0 ? `${first} ${rest[rest.length - 1]!.charAt(0)}.` : (first ?? name);
}

const styles = StyleSheet.create({
  court: {
    height: 132,
    borderRadius: Radius.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  serviceLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  centerLine: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '50%',
    height: 2,
    marginTop: -1,
  },
  net: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 4,
    marginLeft: -2,
  },
  backZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLetter: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 26,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  half: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  player: {
    maxWidth: '100%',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
  },
  invited: {
    opacity: 0.75,
  },
  playerText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
  },
  invitedTag: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  freeSpot: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
