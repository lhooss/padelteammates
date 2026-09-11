import { FRMT_CATEGORIES, type FrmtCategory } from '@padelteammates/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { FrmtRankingEntry } from '@/api/types';
import { Chip } from '@/components/chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { FRMT_CATEGORY_LABEL, formatDate, formatPoints } from '@/lib/frmt';
import { useFrmtSearchQuery, useFrmtStatusQuery, useLinkFrmtMutation } from '@/store/api';

// Se retrouver dans le classement national FRMT importe et demander le lien avec son profil
// (valide ensuite par l'administrateur).
export default function FrmtLinkScreen() {
  const theme = useTheme();
  const [category, setCategory] = useState<FrmtCategory>('MEN');
  const [query, setQuery] = useState('');
  const term = query.trim();
  const { data: status } = useFrmtStatusQuery();
  const search = useFrmtSearchQuery({ q: term, category }, { skip: term.length < 2 });
  const [linkFrmt, { isLoading: linking }] = useLinkFrmtMutation();

  function confirm(entry: FrmtRankingEntry) {
    Alert.alert(
      'Relier ce classement à votre profil ?',
      `${entry.fullName}${entry.birthYear ? ` (${entry.birthYear})` : ''}, ${entry.rank}e. L'administrateur vérifiera qu'il s'agit bien de vous.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Relier',
          onPress: async () => {
            try {
              await linkFrmt({ category: entry.category, fullName: entry.fullName, birthYear: entry.birthYear }).unwrap();
              router.back();
            } catch (err) {
              Alert.alert('Lien impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
            }
          },
        },
      ],
    );
  }

  const lastImport = status?.lastSuccess?.finishedAt;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {lastImport
            ? `Classement national padel de la FRMT, importé le ${formatDate(lastImport)}.`
            : "Le classement FRMT n'a pas encore été importé."}
        </ThemedText>
        <View style={styles.chips}>
          {FRMT_CATEGORIES.map((value) => (
            <Chip
              key={value}
              label={FRMT_CATEGORY_LABEL[value]}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </View>
        <TextField
          label="Votre nom dans le classement"
          placeholder="Nom (2 lettres minimum)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={term.length >= 2 ? (search.data ?? []) : []}
        keyExtractor={(entry) => entry.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            disabled={linking}
            onPress={() => confirm(item)}
            style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }]}>
            <ThemedText type="smallBold" style={styles.rank}>
              {item.rank}e
            </ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{item.fullName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[item.birthYear, item.club].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
            <ThemedText type="small">{formatPoints(item.points)}</ThemedText>
          </Pressable>
        )}
        ListEmptyComponent={
          term.length < 2 ? null : search.isFetching ? (
            <ActivityIndicator color={theme.primary} style={styles.empty} />
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {errorMessage(search.error) ?? 'Aucun joueur trouvé dans ce classement.'}
            </ThemedText>
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  rank: {
    minWidth: 40,
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
