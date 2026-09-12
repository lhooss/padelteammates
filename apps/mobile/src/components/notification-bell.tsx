import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNotificationsQuery } from '@/store/api';

// Sans notifications push pour l'instant : on verifie les nouveautes chaque minute.
const POLLING_MS = 60_000;

// Cloche des en-tetes : nombre de notifications non lues (pastille couleur balle).
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
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.ball, borderColor: theme.background }]}>
          <Text style={[styles.badgeText, { color: theme.onBall }]}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
  },
});
