import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from './themed-text';

import type { Score, Team } from '@/api/types';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Score facon tableau de retransmission : une ligne par equipe, un chiffre par set.
// La balle jaune marque l'equipe gagnante.
export function ScoreSummary({ score, myTeam }: { score: Score; myTeam?: Team }) {
  const theme = useTheme();
  const { games } = score.setsDetail;
  const winner = score.winningTeam;
  const outcome =
    winner === null
      ? 'Égalité'
      : myTeam
        ? winner === myTeam
          ? 'Victoire de votre équipe'
          : "Victoire de l'équipe adverse"
        : `Victoire de l'équipe ${winner}`;

  return (
    <View style={[styles.board, { borderColor: theme.border }]}>
      {games.map((game, gi) => (
        <View key={gi} style={styles.game}>
          {games.length > 1 ? (
            <ThemedText type="eyebrow" themeColor="textSecondary">
              Partie {gi + 1}
            </ThemedText>
          ) : null}
          {(['A', 'B'] as const).map((team) => (
            <View key={team} style={styles.row}>
              <View
                style={[
                  styles.ball,
                  winner === team ? { backgroundColor: theme.ball, borderColor: theme.ball } : { borderColor: theme.border },
                ]}
              />
              <ThemedText type={myTeam === team ? 'smallBold' : 'small'} style={styles.team}>
                Équipe {team}
                {myTeam === team ? ' · vous' : ''}
              </ThemedText>
              {game.sets.map((set, si) => {
                const games = team === 'A' ? set.a : set.b;
                const wonSet = team === 'A' ? set.a > set.b : set.b > set.a;
                return (
                  <Text key={si} style={[styles.set, { color: wonSet ? theme.text : theme.textSecondary }]}>
                    {games}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      ))}
      <ThemedText type="eyebrow" themeColor={winner && winner === myTeam ? 'primary' : 'textSecondary'}>
        {outcome}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  game: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ball: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  team: {
    flex: 1,
  },
  set: {
    width: 26,
    textAlign: 'center',
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 26,
  },
});
