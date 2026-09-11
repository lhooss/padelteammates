import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedView } from './themed-view';

import { MaxContentWidth } from '@/constants/theme';

// Conteneur d'ecran : fond du theme, zones sures, largeur max (tablette / web).
export function Screen({ children, edges = ['top'] }: { children: ReactNode; edges?: Edge[] }) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={edges} style={styles.safeArea}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
