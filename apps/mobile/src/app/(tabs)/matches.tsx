import { router } from 'expo-router';
import { Alert, SectionList, StyleSheet, View } from 'react-native';

import type { Match } from '@/api/types';
import { Button } from '@/components/button';
import { JoinMatchActions } from '@/components/join-match-actions';
import { CourtBooking } from '@/components/court-booking';
import { JoinRequestsList } from '@/components/join-requests-list';
import { MatchActions } from '@/components/match-actions';
import { MatchCard } from '@/components/match-card';
import { QueryState } from '@/components/query-state';
import { ScoreActions } from '@/components/score-actions';
import { Screen } from '@/components/screen';
import { headerActionStyle, ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import {
  canManagePlayers,
  hasFreeSpot,
  isAbandoned,
  isParticipant,
  isPendingInvitation,
  needsMyAction,
} from '@/lib/matches';
import { useMeQuery, useMyMatchesQuery, useRespondInviteMutation } from '@/store/api';

// Mes matchs : invitations, actions a traiter (scores, demandes pour rejoindre),
// mes demandes envoyees, matchs a venir et termines.
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
    <ScreenHeader
      title="Mes matchs"
      action={<Button title="Planifier" style={headerActionStyle} onPress={() => router.push('/match/new')} />}
    />
  );

  if (!data || !me) {
    return (
      <Screen>
        {header}
        <QueryState loading={isLoading || !me} error={errorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const playing = data.filter((m) => isParticipant(m, me.id));
  const isInvited = (m: Match) => isPendingInvitation(m, me.id);
  const toHandle = (m: Match) => !isInvited(m) && needsMyAction(m, me.id);
  const sections = [
    { title: 'Invitations', data: playing.filter(isInvited) },
    { title: 'À traiter : scores et demandes', data: playing.filter(toHandle) },
    // Matchs ou je ne joue pas encore : mes demandes pour rejoindre.
    { title: 'Mes demandes pour rejoindre', data: data.filter((m) => !isParticipant(m, me.id)) },
    {
      title: 'À venir',
      data: playing.filter(
        (m) => m.status !== 'COMPLETED' && !isInvited(m) && !toHandle(m) && !isAbandoned(m, me.id),
      ),
    },
    { title: 'Terminés', data: playing.filter((m) => m.status === 'COMPLETED') },
    // Creneau passe sans resultat : le match n'aura pas lieu, mais on le garde
    // visible plutot que de le faire disparaitre sans explication.
    { title: 'Sans suite', data: playing.filter((m) => isAbandoned(m, me.id)) },
  ].filter((s) => s.data.length > 0);

  return (
    <Screen>
      {header}
      <SectionList
        sections={sections}
        keyExtractor={(match) => match.id}
        renderSectionHeader={({ section }) => (
          <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.sectionTitle}>
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
            <CourtBooking match={item} meId={me.id} />
            <ScoreActions match={item} meId={me.id} />
            <JoinRequestsList match={item} meId={me.id} />
            <JoinMatchActions match={item} meId={me.id} />
            {canManagePlayers(item, me.id) ? (
              <Button
                title={hasFreeSpot(item) ? 'Inviter des joueurs' : 'Gérer les joueurs'}
                variant="secondary"
                onPress={() => router.push({ pathname: '/match/[id]/invite', params: { id: item.id } })}
              />
            ) : null}
            <MatchActions match={item} meId={me.id} />
          </MatchCard>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Vous n'avez encore aucun match. Planifiez-en un, ou demandez à rejoindre un match depuis le
            calendrier.
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
