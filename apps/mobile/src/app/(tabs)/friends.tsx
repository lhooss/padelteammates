import { useState } from 'react';
import { ActivityIndicator, FlatList, SectionList, StyleSheet, View } from 'react-native';

import type { FriendshipState, PlayerSummary } from '@/api/types';
import { PlayerRow } from '@/components/player-row';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { useFriendRequestsQuery, useFriendsQuery, useSearchPlayersQuery } from '@/store/api';

type Row = { player: PlayerSummary; friendship: FriendshipState };

// Amis : recherche de joueurs par nom, demandes recues / envoyees, liste d'amis.
export default function FriendsScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const term = query.trim();
  const searching = term.length >= 2;

  const search = useSearchPlayersQuery(term, { skip: !searching });
  const requests = useFriendRequestsQuery();
  const friends = useFriendsQuery();

  const sections = [
    {
      title: 'Demandes reçues',
      data: (requests.data?.received ?? []).map((r): Row => ({ player: r.user, friendship: 'REQUEST_RECEIVED' })),
    },
    {
      title: 'Demandes envoyées',
      data: (requests.data?.sent ?? []).map((r): Row => ({ player: r.user, friendship: 'REQUEST_SENT' })),
    },
    {
      title: 'Mes amis',
      data: (friends.data ?? []).map((f): Row => ({ player: f, friendship: 'FRIENDS' })),
    },
  ].filter((s) => s.data.length > 0);

  return (
    <Screen>
      {/* Hors de la liste : le champ garde le focus quand on passe a l'affichage des resultats. */}
      <View style={styles.header}>
        <ThemedText type="subtitle">Amis</ThemedText>
        <TextField
          label="Rechercher un joueur"
          placeholder="Nom (2 lettres minimum)"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {searching ? (
        <FlatList
          data={search.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PlayerRow player={item} friendship={item.friendship} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            search.isFetching ? (
              <ActivityIndicator color={theme.primary} style={styles.empty} />
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {errorMessage(search.error) ?? 'Aucun joueur trouvé.'}
              </ThemedText>
            )
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.player.id}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => <PlayerRow player={item.player} friendship={item.friendship} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            requests.isLoading || friends.isLoading ? (
              <ActivityIndicator color={theme.primary} style={styles.empty} />
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Ajoutez vos partenaires de padel : recherchez-les par leur nom. Seuls vos amis peuvent être
                invités à vos matchs.
              </ThemedText>
            )
          }
          refreshing={requests.isFetching || friends.isFetching}
          onRefresh={() => {
            void requests.refetch();
            void friends.refetch();
          }}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
});
