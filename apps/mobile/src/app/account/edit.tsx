import {
  COURT_SIDES,
  HANDS,
  PLAYER_LEVELS,
  updateProfileSchema,
  type CourtSide,
  type Hand,
  type PlayerLevel,
  type UpdateProfileRequest,
} from '@padelteammates/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import type { User } from '@/api/types';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { HAND_LABEL, LEVEL_LABEL, SIDE_LABEL, formatPhone } from '@/lib/profile';
import { useClubsQuery, useMeQuery, useUpdateMeMutation } from '@/store/api';

// Modifier son profil : nom, profil padel, club habituel, telephone.
export default function EditProfileScreen() {
  const { data: me, isLoading, error, refetch } = useMeQuery();
  if (!me) {
    return (
      <ThemedView style={styles.container}>
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      </ThemedView>
    );
  }
  return <EditProfileForm me={me} />;
}

// Monte une fois le profil charge : l'etat initial en depend.
function EditProfileForm({ me }: { me: User }) {
  const { data: clubs } = useClubsQuery();
  const [updateMe, { isLoading, error }] = useUpdateMeMutation();
  const [name, setName] = useState(me.name);
  const [username, setUsername] = useState(me.username);
  const [preferredSide, setPreferredSide] = useState<CourtSide | null>(me.preferredSide);
  const [level, setLevel] = useState<PlayerLevel | null>(me.level);
  const [dominantHand, setDominantHand] = useState<Hand | null>(me.dominantHand);
  const [homeClubId, setHomeClubId] = useState<string | null>(me.homeClub?.id ?? null);
  const [phone, setPhone] = useState(me.phone ? formatPhone(me.phone) : '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function save() {
    const body: UpdateProfileRequest = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      preferredSide,
      level,
      dominantHand,
      homeClubId,
      phone: phone.trim() === '' ? null : phone,
    };
    // Memes regles que l'API (packages/shared), dont le format du telephone.
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      await updateMe(body).unwrap();
      router.back();
    } catch {
      // Affichee via `error`.
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Nom" value={name} onChangeText={setName} autoComplete="name" error={fieldErrors.name} />

          <View style={styles.section}>
            <TextField
              label="Identifiant"
              value={username}
              onChangeText={(value) => setUsername(value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.username}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Il vous distingue des joueurs qui portent le même nom, et permet de vous retrouver dans la recherche.
            </ThemedText>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Profil padel, visible par tous les joueurs. Touchez un choix sélectionné pour l'effacer.
          </ThemedText>

          <Choices title="Niveau">
            {PLAYER_LEVELS.map((value) => (
              <Chip
                key={value}
                label={LEVEL_LABEL[value]}
                selected={level === value}
                onPress={() => setLevel(level === value ? null : value)}
              />
            ))}
          </Choices>

          <Choices title="Côté préféré">
            {COURT_SIDES.map((value) => (
              <Chip
                key={value}
                label={SIDE_LABEL[value]}
                selected={preferredSide === value}
                onPress={() => setPreferredSide(preferredSide === value ? null : value)}
              />
            ))}
          </Choices>

          <Choices title="Main">
            {HANDS.map((value) => (
              <Chip
                key={value}
                label={HAND_LABEL[value]}
                selected={dominantHand === value}
                onPress={() => setDominantHand(dominantHand === value ? null : value)}
              />
            ))}
          </Choices>

          <Choices title="Club habituel">
            {clubs?.map((club) => (
              <Chip
                key={club.id}
                label={club.name}
                selected={homeClubId === club.id}
                onPress={() => setHomeClubId(homeClubId === club.id ? null : club.id)}
              />
            ))}
          </Choices>

          <TextField
            label="Téléphone (visible uniquement par vos amis)"
            placeholder="06 12 34 56 78"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={fieldErrors.phone}
          />

          {error ? <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText> : null}
          <Button title="Enregistrer" onPress={save} loading={isLoading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Choices({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {title}
      </ThemedText>
      <View style={styles.wrap}>{children}</View>
    </View>
  );
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
});
