import { Alert, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';

import type { Match } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { canRequestToJoin, freeSpots, myJoinRequest } from '@/lib/matches';
import { useRemoveJoinRequestMutation, useRequestToJoinMutation } from '@/store/api';

// Cote joueur : demander une place libre dans un match, ou annuler sa demande en cours.
export function JoinMatchActions({ match, meId }: { match: Match; meId: string }) {
  const [requestToJoin, joining] = useRequestToJoinMutation();
  const [removeJoinRequest, removing] = useRemoveJoinRequestMutation();
  const mine = myJoinRequest(match, meId);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (err) {
      Alert.alert('Action impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  if (mine) {
    return (
      <View style={styles.row}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          Demande envoyée pour l'équipe {mine.team}, en attente de l'organisateur.
        </ThemedText>
        <Button
          title="Annuler"
          variant="secondary"
          style={styles.compact}
          loading={removing.isLoading}
          onPress={() => run(() => removeJoinRequest({ matchId: match.id, userId: meId }).unwrap())}
        />
      </View>
    );
  }

  if (!canRequestToJoin(match, meId)) return null;
  const spots = freeSpots(match);

  return (
    <View style={styles.row}>
      {(['A', 'B'] as const)
        .filter((team) => spots[team] > 0)
        .map((team) => (
          <Button
            key={team}
            title={`Rejoindre l'équipe ${team}`}
            variant="secondary"
            style={styles.flex}
            disabled={joining.isLoading}
            onPress={() => run(() => requestToJoin({ matchId: match.id, team }).unwrap())}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
});
