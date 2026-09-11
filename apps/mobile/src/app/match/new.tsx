import { createMatchSchema } from '@padelteammates/shared';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { CreateMatchRequest, PlayerSummary } from '@/api/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { addMinutesToTime, dayChipLabel, slotStarts, upcomingDays } from '@/lib/dates';
import { useClubsQuery, useCreateMatchMutation, useFriendsQuery } from '@/store/api';

const SLOT_MINUTES = 90; // creneau standard de padel
const DAYS_AHEAD = 14;
type Role = 'partner' | 'opponent';
const MAX: Record<Role, number> = { partner: 1, opponent: 2 };

// Planifier un match : club, jour, creneau d'1h30, puis invitation d'amis
// (1 partenaire dans mon equipe, 2 adversaires). Le match peut etre cree incomplet.
export default function NewMatchScreen() {
  const theme = useTheme();
  const { data: clubs } = useClubsQuery();
  const { data: friends } = useFriendsQuery();
  const [createMatch, { isLoading, error }] = useCreateMatchMutation();

  const days = upcomingDays(DAYS_AHEAD);
  const [clubId, setClubId] = useState<string>();
  const [day, setDay] = useState(days[0]!);
  const [start, setStart] = useState<string>();
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const starts = slotStarts(day);
  const slot = start && starts.includes(start) ? `${start}-${addMinutesToTime(start, SLOT_MINUTES)}` : undefined;
  const count = (role: Role) => Object.values(roles).filter((r) => r === role).length;

  function toggle(friendId: string, role: Role) {
    setRoles((prev) => {
      const next = { ...prev };
      if (next[friendId] === role) delete next[friendId];
      else next[friendId] = role;
      return next;
    });
  }

  async function submit() {
    if (!clubId || !slot) {
      setFormError('Choisissez un club, un jour et une heure.');
      return;
    }
    const body: CreateMatchRequest = {
      clubId,
      date: day,
      slot,
      creatorTeam: 'A',
      invites: Object.entries(roles).map(([userId, role]) => ({ userId, team: role === 'partner' ? 'A' : 'B' })),
    };
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

  const summary = summarize(friends ?? [], roles);

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

        <Section title="Joueurs" hint="Invitez 1 partenaire et 2 adversaires parmi vos amis (facultatif).">
          {friends && friends.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Vous n'avez pas encore d'amis à inviter.{' '}
              <Link href="/friends" style={{ color: theme.primary }}>
                Trouver des joueurs
              </Link>
            </ThemedText>
          ) : (
            (friends ?? []).map((friend) => (
              <View key={friend.id} style={styles.friendRow}>
                <ThemedText type="small" style={styles.friendName}>
                  {friend.name}
                </ThemedText>
                {(['partner', 'opponent'] as const).map((role) => (
                  <Chip
                    key={role}
                    label={role === 'partner' ? 'Partenaire' : 'Adversaire'}
                    selected={roles[friend.id] === role}
                    disabled={roles[friend.id] !== role && count(role) >= MAX[role]}
                    onPress={() => toggle(friend.id, role)}
                  />
                ))}
              </View>
            ))
          )}
        </Section>

        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">Équipes</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {summary}
          </ThemedText>
        </ThemedView>

        {formError || error ? <ThemedText themeColor="danger">{formError ?? errorMessage(error)}</ThemedText> : null}
        <Button title="Planifier le match" onPress={submit} loading={isLoading} />
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

// "Vous + Sara contre Mehdi et une place libre"
function summarize(friends: PlayerSummary[], roles: Record<string, Role>): string {
  const name = (role: Role) => friends.filter((f) => roles[f.id] === role).map((f) => f.name);
  const partner = name('partner')[0] ?? 'une place libre';
  const opponents = name('opponent');
  const others = [...opponents, ...Array.from({ length: 2 - opponents.length }, () => 'une place libre')];
  return `Vous + ${partner}  contre  ${others.join(' et ')}`;
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
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  friendName: {
    flex: 1,
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
