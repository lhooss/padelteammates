import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Etat plein ecran d'une requete : chargement, ou erreur avec bouton "Reessayer".
export function QueryState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  const theme = useTheme();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ThemedText themeColor="textSecondary" style={styles.message}>
        {error}
      </ThemedText>
      <Button title="Réessayer" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
});
