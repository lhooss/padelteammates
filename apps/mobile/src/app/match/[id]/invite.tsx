import { addInvitesSchema } from '@padelteammates/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Participant, Team } from '@/api/types';
import { Button } from '@/components/button';
import { InviteFriendsPicker, toInvites, type InviteRoles } from '@/components/invite-friends-picker';
import { MatchCard } from '@/components/match-card';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { confirmAction } from '@/lib/confirm';
import { freeSpots } from '@/lib/matches';
import {
  useFriendsQuery,
  useInvitePlayersMutation,
  useLeaveMatchMutation,
  useMatchQuery,
  useMeQuery,
} from '@/store/api';

// Composition d'un match deja cree (organisateur) : retirer un joueur, completer
// les places libres avec des amis.
export default function MatchPlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useMeQuery();
  const { data: match, isLoading, error, refetch } = useMatchQuery(id);
  const { data: friends } = useFriendsQuery();
  const [invitePlayers, { isLoading: sending, error: sendError }] = useInvitePlayersMutation();
  const [removePlayer, { isLoading: removing, error: removeError }] = useLeaveMatchMutation();
  const [roles, setRoles] = useState<InviteRoles>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!match || !me) {
    return (
      <ThemedView style={styles.container}>
        <QueryState loading={isLoading || !me} error={errorMessage(error)} onRetry={refetch} />
      </ThemedView>
    );
  }

  const organizerTeam: Team = match.participants.find((p) => p.userId === match.createdById)?.team ?? 'A';
  const spots = freeSpots(match);
  const capacity = { partner: spots[organizerTeam], opponent: spots[organizerTeam === 'A' ? 'B' : 'A'] };
  const available = (friends ?? []).filter((f) => !match.participants.some((p) => p.userId === f.id));
  const others = match.participants.filter((p) => p.userId !== match.createdById);
  const matchId = match.id;

  async function submit() {
    const body = { invites: toInvites(roles, organizerTeam) };
    const parsed = addInvitesSchema.safeParse(body);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Sélection invalide');
      return;
    }
    setFormError(null);
    try {
      await invitePlayers({ matchId, invites: body.invites }).unwrap();
      router.back();
    } catch {
      // Affichee via `sendError` (ex. joueur deja pris sur ce creneau).
    }
  }

  async function remove(player: Participant) {
    const confirmed = await confirmAction({
      title: 'Retirer ce joueur ?',
      message: `${player.user.name} est retiré du match et sa place redevient libre. Le joueur en est prévenu.`,
      confirmLabel: 'Retirer',
    });
    if (confirmed) await removePlayer({ matchId, userId: player.userId });
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <MatchCard match={match} meId={me.id} />

        {others.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Joueurs du match</ThemedText>
            {others.map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.flex}>
                  <ThemedText numberOfLines={1}>{player.user.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Équipe {player.team}
                    {player.presenceStatus === 'INVITED' ? ' · invité' : ''}
                  </ThemedText>
                </View>
                <Button
                  title="Retirer"
                  variant="danger"
                  style={styles.compact}
                  disabled={removing}
                  onPress={() => remove(player)}
                />
              </View>
            ))}
          </View>
        ) : null}

        {capacity.partner + capacity.opponent === 0 ? (
          <ThemedText themeColor="textSecondary">Le match est complet.</ThemedText>
        ) : (
          <View style={styles.section}>
            <ThemedText type="smallBold">Inviter des amis</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {placesLabel(capacity)}
            </ThemedText>
            <InviteFriendsPicker friends={available} roles={roles} onChange={setRoles} capacity={capacity} />
          </View>
        )}

        {formError || sendError || removeError ? (
          <ThemedText themeColor="danger">
            {formError ?? errorMessage(sendError) ?? errorMessage(removeError)}
          </ThemedText>
        ) : null}
        <Button
          title="Envoyer les invitations"
          onPress={submit}
          loading={sending}
          disabled={Object.keys(roles).length === 0}
        />
      </ScrollView>
    </ThemedView>
  );
}

// "Places libres : 1 partenaire et 2 adversaires"
function placesLabel({ partner, opponent }: { partner: number; opponent: number }): string {
  const parts = [
    partner > 0 ? `${partner} partenaire` : null,
    opponent > 0 ? `${opponent} adversaire${opponent > 1 ? 's' : ''}` : null,
  ].filter(Boolean);
  return `Places libres : ${parts.join(' et ')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  playerRow: {
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
