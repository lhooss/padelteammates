import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationsQuery } from '@/store/api';

// Sans notifications push pour l'instant : on verifie les nouveautes chaque minute.
const POLLING_MS = 60_000;

// Cloche des en-tetes : nombre de notifications non lues, ouvre l'ecran des notifications.
export function NotificationBell() {
  const theme = useTheme();
  const { data } = useNotificationsQuery(undefined, { pollingInterval: POLLING_MS });
  const unread = data?.filter((n) => !n.read).length ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} non lues` : 'Notifications'}
      hitSlop={8}
      onPress={() => router.push('/notifications')}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.background }]}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: Spacing.half,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 700,
  },
});
