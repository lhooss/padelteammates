import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import type { FrmtPendingLink } from '@/api/types';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { FRMT_CATEGORY_LABEL, formatDate, formatPoints } from '@/lib/frmt';
import {
  useFrmtPendingLinksQuery,
  useFrmtStatusQuery,
  useImportFrmtMutation,
  useRejectFrmtLinkMutation,
  useVerifyFrmtLinkMutation,
} from '@/store/api';

// Administration du classement FRMT : etat des imports, import immediat,
// demandes de lien a valider ou refuser.
export default function FrmtAdminScreen() {
  const { data: status } = useFrmtStatusQuery();
  const { data: links, isLoading } = useFrmtPendingLinksQuery();
  const [importFrmt, { isLoading: importing }] = useImportFrmtMutation();

  async function runImport() {
    try {
      const run = await importFrmt().unwrap();
      Alert.alert('Classement importé', `${run.menCount} messieurs et ${run.womenCount} dames.`);
    } catch (err) {
      Alert.alert('Import échoué', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  const success = status?.lastSuccess;
  const failed = status?.lastAttempt?.error ? status.lastAttempt : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="smallBold">Import du classement</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {success?.finishedAt
              ? `Dernier import réussi le ${formatDate(success.finishedAt)} : ${success.menCount} messieurs, ${success.womenCount} dames.`
              : 'Aucun import réussi pour le moment.'}
            {' '}L'import automatique a lieu une fois par jour.
          </ThemedText>
          {failed ? (
            <ThemedText type="small" themeColor="danger">
              Dernière tentative en échec ({formatDate(failed.startedAt)}) : {failed.error}
            </ThemedText>
          ) : null}
          <Button title="Importer maintenant" variant="secondary" loading={importing} onPress={runImport} />
          {importing ? (
            <ThemedText type="small" themeColor="textSecondary">
              Lecture du site de la FRMT, cela peut prendre une minute…
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Demandes de lien à valider</ThemedText>
          {isLoading ? null : links && links.length > 0 ? (
            links.map((link) => <PendingLink key={link.id} link={link} />)
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Aucune demande en attente.
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function PendingLink({ link }: { link: FrmtPendingLink }) {
  const [verify, verifying] = useVerifyFrmtLinkMutation();
  const [reject, rejecting] = useRejectFrmtLinkMutation();
  const [done, setDone] = useState(false);
  const busy = verifying.isLoading || rejecting.isLoading || done;

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setDone(true);
    } catch (err) {
      Alert.alert('Action impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {link.user.name} <ThemedText type="small" themeColor="textSecondary">({link.user.email})</ThemedText>
      </ThemedText>
      <ThemedText type="small">
        Se déclare : {link.fullName}
        {link.birthYear ? ` (${link.birthYear})` : ''} · {FRMT_CATEGORY_LABEL[link.category]}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {link.entry
          ? `${link.entry.rank}e · ${formatPoints(link.entry.points)}${link.entry.club ? ` · club ${link.entry.club}` : ''}`
          : 'Absent du dernier classement importé.'}
      </ThemedText>
      <View style={styles.actions}>
        <Button
          title="Refuser"
          variant="secondary"
          style={styles.flex}
          disabled={busy}
          onPress={() => run(() => reject(link.id).unwrap())}
        />
        <Button title="Valider" style={styles.flex} disabled={busy} onPress={() => run(() => verify(link.id).unwrap())} />
      </View>
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
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
