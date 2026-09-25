import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { FriendAction } from './friend-action';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { FriendshipState, PlayerSummary } from '@/api/types';
import { Spacing } from '@/constants/theme';

// Ligne de joueur : nom (ouvre son profil) + action d'amitie.
export function PlayerRow({ player, friendship }: { player: PlayerSummary; friendship: FriendshipState }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Pressable
        accessibilityRole="link"
        style={styles.name}
        onPress={() => router.push({ pathname: '/players/[id]', params: { id: player.id } })}>
        <ThemedText type="smallBold">{player.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{player.username}
        </ThemedText>
      </Pressable>
      <View>
        <FriendAction userId={player.id} name={player.name} state={friendship} compact />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 56,
  },
  name: {
    flex: 1,
    paddingVertical: Spacing.two,
  },
});
