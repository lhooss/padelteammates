import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Ecrans de connexion / inscription : le haut est un terrain vu du dessus (moitie adverse,
// filet, balle), le formulaire se pose dessus comme une feuille.
export function AuthForm({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { backgroundColor: theme.court, paddingTop: insets.top + Spacing.five }]}>
          <CourtBackdrop />
          <Text style={styles.wordmark}>{'Padel\nteammates'}</Text>
          <Text style={styles.tagline}>Vos matchs de padel à Kénitra</Text>
          <View style={[styles.ball, { backgroundColor: theme.ball }]} />
        </View>

        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.heading}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
          </View>
          <View style={styles.form}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Moitie de terrain en traits fins : bords, ligne de service, ligne mediane, filet en bas.
function CourtBackdrop() {
  return (
    <View style={styles.backdrop} pointerEvents="none">
      <View style={[styles.lines, styles.outline]} />
      <View style={[styles.lines, styles.serviceLine]} />
      <View style={[styles.lines, styles.centerLine]} />
      <View style={[styles.lines, styles.net]} />
    </View>
  );
}

const LINE = 'rgba(255, 255, 255, 0.16)';

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    minHeight: 300,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lines: {
    position: 'absolute',
    borderColor: LINE,
  },
  outline: {
    top: -2,
    left: 24,
    right: 24,
    bottom: 40,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  serviceLine: {
    left: 24,
    right: 24,
    bottom: 150,
    borderTopWidth: 2,
  },
  centerLine: {
    left: '50%',
    bottom: 40,
    height: 110,
    borderLeftWidth: 2,
  },
  net: {
    left: 0,
    right: 0,
    bottom: 38,
    borderTopWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  wordmark: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 64,
    lineHeight: 58,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: Spacing.two,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ball: {
    position: 'absolute',
    right: 56,
    bottom: 64,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -Spacing.four,
    borderTopLeftRadius: Radius.lg + 6,
    borderTopRightRadius: Radius.lg + 6,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.three,
  },
});
