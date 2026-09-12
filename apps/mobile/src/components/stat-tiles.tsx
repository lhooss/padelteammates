import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Victoires / defaites / pourcentage, en grands chiffres de tableau d'affichage.
export function StatTiles({ wins, losses }: { wins: number; losses: number }) {
  const played = wins + losses;
  const winRate = played === 0 ? '–' : `${Math.round((wins / played) * 100)}%`;

  return (
    <ThemedView type="backgroundElement" style={styles.tiles}>
      <Tile label="Victoires" value={String(wins)} />
      <Divider />
      <Tile label="Défaites" value={String(losses)} />
      <Divider />
      <Tile label="Victoires %" value={winRate} />
    </ThemedView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  value: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 44,
    lineHeight: 46,
  },
  divider: {
    width: 1,
    height: 40,
  },
});
