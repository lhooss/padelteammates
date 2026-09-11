import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { AppNotification } from '@/api/types';
import { Button } from '@/components/button';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { notificationLabel, notificationTarget, timeAgo } from '@/lib/notifications';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMeQuery,
  useNotificationsQuery,
} from '@/store/api';

// Notifications in-app : invitations, demandes, scores, classement FRMT.
// Toucher une notification la marque comme lue et ouvre l'ecran concerne.
export default function NotificationsScreen() {
  const { data: me } = useMeQuery();
  const { data, isLoading, isFetching, error, refetch } = useNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  if (!data) {
    return (
      <ThemedView style={styles.container}>
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      </ThemedView>
    );
  }

  const unread = data.filter((n) => !n.read).length;

  function open(notification: AppNotification) {
    if (!notification.read) void markRead(notification.id);
    const target = notificationTarget(notification, me?.role === 'ADMIN');
    if (target) router.navigate(target);
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          unread > 0 ? (
            <Button
              title={`Tout marquer comme lu (${unread})`}
              variant="secondary"
              loading={markingAll}
              onPress={() => void markAllRead()}
              style={styles.markAll}
            />
          ) : null
        }
        renderItem={({ item }) => <NotificationRow notification={item} onPress={() => open(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Aucune notification pour le moment.
          </ThemedText>
        }
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
      />
    </ThemedView>
  );
}

function NotificationRow({ notification, onPress }: { notification: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const unread = !notification.read;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: unread ? theme.backgroundSelected : theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={[styles.dot, { backgroundColor: unread ? theme.primary : 'transparent' }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <ThemedText type="smallBold" themeColor={unread ? 'primary' : 'textSecondary'} style={styles.flex}>
            {notificationLabel(notification.type)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {timeAgo(notification.createdAt)}
          </ThemedText>
        </View>
        <ThemedText type={unread ? 'smallBold' : 'small'}>{notification.message}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  markAll: {
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
