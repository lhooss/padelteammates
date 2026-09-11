import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';

import type { Match } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { freeSpots, joinRequestsToAnswer } from '@/lib/matches';
import { useAcceptJoinRequestMutation, useRemoveJoinRequestMutation } from '@/store/api';

// Cote organisateur : demandes pour rejoindre son match, a accepter ou refuser.
export function JoinRequestsList({ match, meId }: { match: Match; meId: string }) {
  const [accept, accepting] = useAcceptJoinRequestMutation();
  const [remove, removing] = useRemoveJoinRequestMutation();
  const requests = joinRequestsToAnswer(match, meId);
  if (requests.length === 0) return null;

  const busy = accepting.isLoading || removing.isLoading;
  const spots = freeSpots(match);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (err) {
      Alert.alert('Action impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  return (
    <View style={styles.list}>
      <ThemedText type="smallBold">Demandes pour rejoindre</ThemedText>
      {requests.map((request) => (
        <View key={request.id} style={styles.row}>
          <Pressable
            accessibilityRole="link"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/players/[id]', params: { id: request.userId } })}>
            <ThemedText type="small" style={styles.link}>
              {request.user.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Équipe {request.team}
              {spots[request.team] === 0 ? ' (complète)' : ''}
            </ThemedText>
          </Pressable>
          <Button
            title="Refuser"
            variant="secondary"
            style={styles.compact}
            disabled={busy}
            onPress={() => run(() => remove({ matchId: match.id, userId: request.userId }).unwrap())}
          />
          <Button
            title="Accepter"
            style={styles.compact}
            disabled={busy || spots[request.team] === 0}
            onPress={() => run(() => accept({ matchId: match.id, userId: request.userId }).unwrap())}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  link: {
    textDecorationLine: 'underline',
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
});
