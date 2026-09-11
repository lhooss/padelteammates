import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { FrmtSummary } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { FRMT_CATEGORY_LABEL, formatDate, formatEvolution, formatPoints } from '@/lib/frmt';

// Classement national FRMT d'un joueur : rang, points, evolution (ou demande en attente).
export function FrmtCard({ summary }: { summary: FrmtSummary }) {
  const evolution = formatEvolution(summary.evolution);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
          Classement FRMT · {FRMT_CATEGORY_LABEL[summary.category]}
        </ThemedText>
        {summary.status === 'PENDING' ? (
          <ThemedText type="small" themeColor="warning">
            À valider
          </ThemedText>
        ) : null}
      </View>

      {summary.rank !== null && summary.points !== null ? (
        <View style={styles.rankRow}>
          <ThemedText type="subtitle">{summary.rank}e</ThemedText>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{formatPoints(summary.points)}</ThemedText>
            <ThemedText type="small" themeColor={evolution.startsWith('-') ? 'danger' : 'textSecondary'}>
              {evolution === '=' ? 'Inchangé' : `${evolution} place${Math.abs(summary.evolution ?? 0) > 1 ? 's' : ''}`}
            </ThemedText>
          </View>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Absent du dernier classement importé.
        </ThemedText>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {summary.fullName}
        {summary.birthYear ? ` (${summary.birthYear})` : ''}
        {summary.club ? ` · ${summary.club}` : ''}
        {summary.importedAt ? ` · mis à jour le ${formatDate(summary.importedAt)}` : ''}
      </ThemedText>
      {summary.status === 'PENDING' ? (
        <ThemedText type="small" themeColor="textSecondary">
          En attente de validation par l'administrateur : il sera ensuite visible sur votre profil.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
});
