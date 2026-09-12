import { StyleSheet, Text, View } from 'react-native';

import type { FrmtSummary } from '@/api/types';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FRMT_CATEGORY_LABEL, formatDate, formatPoints } from '@/lib/frmt';

// Classement national FRMT d'un joueur, sur fond de gazon : rang en grand, points, evolution.
export function FrmtCard({ summary }: { summary: FrmtSummary }) {
  const theme = useTheme();
  const evolution = summary.evolution ?? 0;
  const places = `${Math.abs(evolution)} place${Math.abs(evolution) > 1 ? 's' : ''}`;
  const details = [
    `${summary.fullName}${summary.birthYear ? ` (${summary.birthYear})` : ''}`,
    summary.club,
    summary.importedAt ? `mis à jour le ${formatDate(summary.importedAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: theme.court }]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Classement FRMT · {FRMT_CATEGORY_LABEL[summary.category]}</Text>
        {summary.status === 'PENDING' ? (
          <View style={[styles.pending, { backgroundColor: theme.ball }]}>
            <Text style={[styles.pendingText, { color: theme.onBall }]}>À valider</Text>
          </View>
        ) : null}
      </View>

      {summary.rank !== null && summary.points !== null ? (
        <View style={styles.rankRow}>
          <Text style={styles.rank}>
            {summary.rank}
            <Text style={styles.rankSuffix}>e</Text>
          </Text>
          <View style={styles.rankDetails}>
            <Text style={styles.points}>{formatPoints(summary.points)}</Text>
            <Text style={[styles.evolution, { color: evolution > 0 ? theme.ball : evolution < 0 ? '#FFB4AE' : 'rgba(255,255,255,0.7)' }]}>
              {evolution > 0 ? `▲ ${places}` : evolution < 0 ? `▼ ${places}` : 'Inchangé'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.absent}>Absent du dernier classement importé.</Text>
      )}

      <Text style={styles.details}>{details}</Text>
      {summary.status === 'PENDING' ? (
        <Text style={styles.details}>
          En attente de validation par l'administrateur : il sera ensuite visible sur votre profil.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  eyebrow: {
    flex: 1,
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  pending: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pendingText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  rank: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 72,
    lineHeight: 72,
    color: '#FFFFFF',
  },
  rankSuffix: {
    fontSize: 32,
  },
  rankDetails: {
    paddingBottom: Spacing.two,
    gap: Spacing.half,
  },
  points: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  evolution: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
  },
  absent: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  details: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
