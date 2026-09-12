import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePendingFriendRequests } from '@/hooks/use-pending-friend-requests';
import { usePendingMatchActions } from '@/hooks/use-pending-match-actions';

const withCount = (label: string, count: number) => (count > 0 ? `${label} (${count})` : label);

// Onglets de la version web (les onglets natifs sont dans app-tabs.tsx).
export default function AppTabs() {
  const matchActions = usePendingMatchActions();
  const friendRequests = usePendingFriendRequests();

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Calendrier</TabButton>
          </TabTrigger>
          <TabTrigger name="matches" href="/matches" asChild>
            <TabButton>{withCount('Matchs', matchActions)}</TabButton>
          </TabTrigger>
          <TabTrigger name="friends" href="/friends" asChild>
            <TabButton>{withCount('Amis', friendRequests)}</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>Profil</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <ThemedView type={isFocused ? 'backgroundSelected' : 'backgroundElement'} style={styles.tabButtonView}>
        <ThemedText type="smallBold" themeColor={isFocused ? 'primary' : 'textSecondary'} numberOfLines={1}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: Spacing.two,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.pill,
    gap: Spacing.one,
  },
  tab: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
