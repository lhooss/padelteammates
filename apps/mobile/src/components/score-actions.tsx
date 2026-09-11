import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';

import type { Match } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { scoreAction } from '@/lib/matches';
import { useValidateScoreMutation } from '@/store/api';

// Actions sur le score d'un match : saisir, valider ou corriger, ou attente de l'autre equipe.
export function ScoreActions({ match, meId }: { match: Match; meId: string }) {
  const [validateScore, { isLoading }] = useValidateScoreMutation();
  const action = scoreAction(match, meId);
  const openForm = () => router.push({ pathname: '/match/[id]/score', params: { id: match.id } });

  async function validate() {
    try {
      const result = await validateScore(match.id).unwrap();
      if (result.status === 'COMPLETED') {
        Alert.alert('Score validé', 'Le match est terminé et les statistiques sont à jour.');
      }
    } catch (err) {
      Alert.alert('Validation impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  switch (action) {
    case 'enter':
      return <Button title="Saisir le score" onPress={openForm} />;
    case 'validate':
      return (
        <View style={styles.row}>
          <Button title="Corriger" variant="secondary" style={styles.flex} disabled={isLoading} onPress={openForm} />
          <Button title="Valider le score" style={styles.flex} loading={isLoading} onPress={validate} />
        </View>
      );
    case 'waiting':
      return (
        <ThemedText type="small" themeColor="textSecondary">
          Votre équipe a validé : en attente de l'équipe adverse.
        </ThemedText>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
