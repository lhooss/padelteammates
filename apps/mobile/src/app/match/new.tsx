import { createMatchSchema } from '@padelteammates/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { CreateMatchRequest, PlayerSummary } from '@/api/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Court, type CourtPlayer } from '@/components/court';
import {
  InviteFriendsPicker,
  toInvites,
  type InviteRole,
  type InviteRoles,
} from '@/components/invite-friends-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { addMinutesToTime, dayChipLabel, slotStarts, upcomingDays } from '@/lib/dates';
import { useClubsQuery, useCreateMatchMutation, useFriendsQuery } from '@/store/api';

const SLOT_MINUTES = 90; // creneau standard de padel
const DAYS_AHEAD = 14;
// Nouvelle partie : je suis dans l'equipe A avec 1 partenaire, face a 2 adversaires.
const CAPACITY: Record<InviteRole, number> = { partner: 1, opponent: 2 };

// Planifier un match : club, jour, creneau d'1h30, puis invitation d'amis. Le terrain
// en bas se compose en direct. Le match peut etre cree incomplet et complete plus tard.
export default function NewMatchScreen() {
  const { data: clubs } = useClubsQuery();
  const { data: friends } = useFriendsQuery();
  const [createMatch, { isLoading, error }] = useCreateMatchMutation();

  const days = upcomingDays(DAYS_AHEAD);
  const [clubId, setClubId] = useState<string>();
  const [day, setDay] = useState(days[0]!);
  const [start, setStart] = useState<string>();
  const [roles, setRoles] = useState<InviteRoles>({});
  const [formError, setFormError] = useState<string | null>(null);

  const starts = slotStarts(day);
  const slot = start && starts.includes(start) ? `${start}-${addMinutesToTime(start, SLOT_MINUTES)}` : undefined;

  async function submit() {
    if (!clubId || !slot) {
      setFormError('Choisissez un club, un jour et une heure.');
      return;
    }
    const body: CreateMatchRequest = { clubId, date: day, slot, creatorTeam: 'A', invites: toInvites(roles, 'A') };
    // Memes regles que l'API (packages/shared) : creneau, date, 2 joueurs max par equipe.
    const parsed = createMatchSchema.safeParse(body);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Formulaire invalide');
      return;
    }
    setFormError(null);
    try {
      await createMatch(body).unwrap();
      router.back();
    } catch {
      // Affichee via `error` (ex. creneau deja reserve dans ce club).
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Club">
          <View style={styles.wrap}>
            {clubs?.map((club) => (
              <Chip key={club.id} label={club.name} selected={clubId === club.id} onPress={() => setClubId(club.id)} />
            ))}
          </View>
        </Section>

        <Section title="Jour">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {days.map((d, i) => (
              <Chip key={d} label={dayChipLabel(d, i)} selected={day === d} onPress={() => setDay(d)} />
            ))}
          </ScrollView>
        </Section>

        <Section title="Heure de début" hint={slot ? `Créneau d'1h30 : ${slot.replace('-', ' – ')}` : undefined}>
          {starts.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Plus de créneau disponible aujourd'hui : choisissez un autre jour.
            </ThemedText>
          ) : (
            <View style={styles.wrap}>
              {starts.map((t) => (
                <Chip key={t} label={t} selected={start === t} onPress={() => setStart(t)} />
              ))}
            </View>
          )}
        </Section>

        <Section
          title="Joueurs"
          hint="Invitez 1 partenaire et 2 adversaires parmi vos amis (facultatif, vous pourrez compléter plus tard).">
          <InviteFriendsPicker friends={friends ?? []} roles={roles} onChange={setRoles} capacity={CAPACITY} />
        </Section>

        <Section title="Votre terrain">
          <Court teams={previewTeams(friends ?? [], roles)} />
        </Section>

        {formError || error ? <ThemedText themeColor="danger">{formError ?? errorMessage(error)}</ThemedText> : null}
        <Button title="Planifier le match" onPress={submit} loading={isLoading} />
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {title}
      </ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

// Apercu du terrain : moi et mon partenaire en A, les adversaires en B.
function previewTeams(friends: PlayerSummary[], roles: InviteRoles): Record<'A' | 'B', CourtPlayer[]> {
  const invited = (role: InviteRole): CourtPlayer[] =>
    friends
      .filter((f) => roles[f.id] === role)
      .map((f) => ({ key: f.id, name: f.name, invited: true }));
  return {
    A: [{ key: 'me', name: 'Vous', isMe: true }, ...invited('partner')],
    B: invited('opponent'),
  };
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
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
});
