import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

// Victoires / defaites / pourcentage, pour son profil et celui des autres joueurs.
export function StatTiles({ wins, losses }: { wins: number; losses: number }) {
  const played = wins + losses;
  const winRate = played === 0 ? '–' : `${Math.round((wins / played) * 100)}%`;

  return (
    <ThemedView type="backgroundElement" style={styles.tiles}>
      <Tile label="Victoires" value={String(wins)} />
      <Tile label="Défaites" value={String(losses)} />
      <Tile label="Victoires %" value={winRate} />
    </ThemedView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
  },
});
