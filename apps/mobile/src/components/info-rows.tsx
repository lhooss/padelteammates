import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Liste "libelle / valeur" (profil padel, coordonnees).
export function InfoRows({ rows }: { rows: { label: string; value: string | null }[] }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={[styles.row, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {row.label}
          </ThemedText>
          <ThemedText type={row.value ? 'smallBold' : 'small'} themeColor={row.value ? 'text' : 'textSecondary'} style={styles.value}>
            {row.value ?? 'Non renseigné'}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: 14,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
