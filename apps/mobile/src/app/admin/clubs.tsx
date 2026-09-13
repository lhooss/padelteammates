import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Club } from '@/api/types';
import { Button } from '@/components/button';
import { QueryState } from '@/components/query-state';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { confirmAction } from '@/lib/confirm';
import {
  useAllClubsQuery,
  useCreateClubMutation,
  useDeleteClubMutation,
  useUpdateClubMutation,
} from '@/store/api';

const DEFAULT_CITY = 'Kénitra';

// Administration des clubs : ajouter, renommer, desactiver (un club ferme garde son
// historique de matchs) et supprimer ceux qui n'ont jamais servi.
export default function ClubsAdminScreen() {
  const { data: clubs, isLoading, error, refetch } = useAllClubsQuery();
  const [createClub, { isLoading: creating, error: createError }] = useCreateClubMutation();
  const [name, setName] = useState('');
  const [city, setCity] = useState(DEFAULT_CITY);

  async function add() {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    try {
      await createClub({ name: trimmed, city: city.trim() || DEFAULT_CITY }).unwrap();
      setName('');
      setCity(DEFAULT_CITY);
    } catch {
      // Affichee via `createError` (ex. ce club existe deja dans cette ville).
    }
  }

  if (!clubs) {
    return (
      <ThemedView style={styles.container}>
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <ThemedText type="smallBold">Nouveau club</ThemedText>
          <TextField
            label="Nom"
            value={name}
            onChangeText={setName}
            placeholder="Ex. Elite Padel Club Kenitra"
            autoCapitalize="words"
          />
          <TextField label="Ville" value={city} onChangeText={setCity} autoCapitalize="words" />
          {createError ? (
            <ThemedText type="small" themeColor="danger">
              {errorMessage(createError)}
            </ThemedText>
          ) : null}
          <Button
            title="Ajouter le club"
            loading={creating}
            disabled={name.trim().length < 2}
            onPress={add}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Clubs ({clubs.length})</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Un club désactivé n'est plus proposé pour planifier un match ni comme club habituel ; les matchs
            déjà joués le gardent.
          </ThemedText>
          {clubs.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Aucun club pour le moment.
            </ThemedText>
          ) : (
            clubs.map((club) => <ClubRow key={club.id} club={club} />)
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function ClubRow({ club }: { club: Club }) {
  const [updateClub, updating] = useUpdateClubMutation();
  const [deleteClub, deleting] = useDeleteClubMutation();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(club.name);

  const busy = updating.isLoading || deleting.isLoading;
  const failure = errorMessage(updating.error) ?? errorMessage(deleting.error);

  async function rename() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === club.name) {
      setName(club.name);
      setRenaming(false);
      return;
    }
    try {
      await updateClub({ id: club.id, name: trimmed }).unwrap();
      setRenaming(false);
    } catch {
      // Affichee via `failure` (ex. ce nom existe deja dans cette ville).
    }
  }

  async function toggleActive() {
    if (club.active) {
      const confirmed = await confirmAction({
        title: 'Désactiver ce club ?',
        message: `${club.name} ne sera plus proposé pour planifier un match. Les matchs déjà joués le gardent.`,
        confirmLabel: 'Désactiver',
      });
      if (!confirmed) return;
    }
    await updateClub({ id: club.id, active: !club.active });
  }

  async function remove() {
    const confirmed = await confirmAction({
      title: 'Supprimer ce club ?',
      message: `${club.name} disparaît définitivement. Un club qui a des matchs ne peut pas être supprimé : désactivez-le.`,
      confirmLabel: 'Supprimer',
    });
    if (confirmed) await deleteClub(club.id);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {renaming ? (
        <>
          <TextField label="Nom du club" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
          <View style={styles.actions}>
            <Button
              title="Annuler"
              variant="secondary"
              style={styles.flex}
              disabled={busy}
              onPress={() => {
                setName(club.name);
                setRenaming(false);
              }}
            />
            <Button title="Enregistrer" style={styles.flex} loading={updating.isLoading} onPress={rename} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {club.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {club.city}
                {club.active ? '' : ' · désactivé'}
              </ThemedText>
            </View>
            <Button
              title="Renommer"
              variant="secondary"
              style={styles.compact}
              disabled={busy}
              onPress={() => setRenaming(true)}
            />
          </View>
          <View style={styles.actions}>
            <Button
              title={club.active ? 'Désactiver' : 'Réactiver'}
              variant={club.active ? 'danger' : 'secondary'}
              style={styles.flex}
              disabled={busy}
              onPress={toggleActive}
            />
            <Button title="Supprimer" variant="danger" style={styles.flex} disabled={busy} onPress={remove} />
          </View>
        </>
      )}
      {failure ? (
        <ThemedText type="small" themeColor="danger">
          {failure}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.five,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
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
