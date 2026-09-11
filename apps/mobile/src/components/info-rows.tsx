import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';

// Liste "libelle / valeur" (profil padel, coordonnees).
export function InfoRows({ rows }: { rows: { label: string; value: string | null }[] }) {
  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            {row.label}
          </ThemedText>
          <ThemedText type="small" themeColor={row.value ? 'text' : 'textSecondary'} style={styles.value}>
            {row.value ?? 'Non renseigné'}
          </ThemedText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
