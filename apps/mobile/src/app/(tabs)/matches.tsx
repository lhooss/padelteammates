import { router } from 'expo-router';
import { Alert, SectionList, StyleSheet, View } from 'react-native';

import type { Match } from '@/api/types';
import { Button } from '@/components/button';
import { MatchCard } from '@/components/match-card';
import { QueryState } from '@/components/query-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { canInvitePlayers, isPendingInvitation } from '@/lib/matches';
import { useMeQuery, useMyMatchesQuery, useRespondInviteMutation } from '@/store/api';

// Mes matchs : invitations a traiter, matchs a venir, matchs termines.
export default function MyMatchesScreen() {
  const { data: me } = useMeQuery();
  const { data, isLoading, isFetching, error, refetch } = useMyMatchesQuery();
  const [respond, { isLoading: responding }] = useRespondInviteMutation();

  async function answer(matchId: string, accept: boolean) {
    try {
      await respond({ matchId, accept }).unwrap();
    } catch (err) {
      Alert.alert('Réponse impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  const header = (
    <View style={styles.header}>
      <ThemedText type="subtitle" style={styles.title}>
        Mes matchs
      </ThemedText>
      <Button title="Planifier" style={styles.planButton} onPress={() => router.push('/match/new')} />
    </View>
  );

  if (!data || !me) {
    return (
      <Screen>
        {header}
        <QueryState loading={isLoading || !me} error={errorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const isInvited = (m: Match) => isPendingInvitation(m, me.id);
  const sections = [
    { title: 'Invitations', data: data.filter(isInvited) },
    { title: 'À venir', data: data.filter((m) => m.status !== 'COMPLETED' && !isInvited(m)) },
    { title: 'Terminés', data: data.filter((m) => m.status === 'COMPLETED') },
  ].filter((s) => s.data.length > 0);

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(match) => match.id}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <MatchCard match={item} meId={me.id}>
            {isInvited(item) ? (
              <View style={styles.actions}>
                <Button
                  title="Refuser"
                  variant="secondary"
                  style={styles.action}
                  disabled={responding}
                  onPress={() => answer(item.id, false)}
                />
                <Button
                  title="Accepter"
                  style={styles.action}
                  disabled={responding}
                  onPress={() => answer(item.id, true)}
                />
              </View>
            ) : null}
            {canInvitePlayers(item, me.id) ? (
              <Button
                title="Inviter des joueurs"
                variant="secondary"
                onPress={() => router.push({ pathname: '/match/[id]/invite', params: { id: item.id } })}
              />
            ) : null}
          </MatchCard>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Vous n'avez encore aucun match. Planifiez-en un et invitez vos amis.
          </ThemedText>
        }
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    flex: 1,
  },
  planButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
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
