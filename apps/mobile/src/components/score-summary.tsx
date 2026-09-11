import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { Score, Team } from '@/api/types';
import { Spacing } from '@/constants/theme';

// Detail d'un score saisi : sets de chaque partie (equipe A – equipe B) et vainqueur.
export function ScoreSummary({ score, myTeam }: { score: Score; myTeam?: Team }) {
  const { games } = score.setsDetail;
  const outcome =
    score.winningTeam === null
      ? 'Égalité'
      : myTeam
        ? score.winningTeam === myTeam
          ? 'Victoire de votre équipe'
          : 'Victoire de l\'équipe adverse'
        : `Victoire de l'équipe ${score.winningTeam}`;

  return (
    <ThemedView type="backgroundSelected" style={styles.box}>
      {games.map((game, i) => (
        <View key={i} style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {games.length > 1 ? `Partie ${i + 1}` : 'Sets (A – B)'}
          </ThemedText>
          <ThemedText type="smallBold">{game.sets.map((s) => `${s.a}-${s.b}`).join('   ')}</ThemedText>
        </View>
      ))}
      <ThemedText type="small">{outcome}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    minWidth: 88,
  },
});
