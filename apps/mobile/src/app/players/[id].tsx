import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FriendAction } from '@/components/friend-action';
import { QueryState } from '@/components/query-state';
import { StatTiles } from '@/components/stat-tiles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { usePlayerQuery } from '@/store/api';

const RELATION_LABEL = {
  SELF: "C'est vous",
  NONE: '',
  FRIENDS: 'Vous êtes amis',
  REQUEST_SENT: "Demande d'ami envoyée",
  REQUEST_RECEIVED: "Vous a envoyé une demande d'ami",
} as const;

// Profil d'un autre joueur : relation d'amitie et stats (si profil public ou ami).
export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: player, isLoading, error, refetch } = usePlayerQuery(id);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: player?.name ?? 'Joueur' }} />
      {!player ? (
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <ThemedText type="subtitle">{player.name}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {[player.profilePublic ? 'Profil public' : 'Profil privé', RELATION_LABEL[player.friendship]]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>

          <FriendAction userId={player.id} name={player.name} state={player.friendship} />

          {player.stats ? (
            <StatTiles wins={player.stats.wins} losses={player.stats.losses} />
          ) : (
            <ThemedView type="backgroundElement" style={styles.privateStats}>
              <ThemedText type="smallBold">Statistiques privées</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Devenez amis pour voir les statistiques de {player.name}.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  identity: {
    gap: Spacing.one,
  },
  privateStats: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
