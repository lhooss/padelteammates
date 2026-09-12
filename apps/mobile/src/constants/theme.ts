/**
 * Identite "Court bleu" : les matieres d'un terrain de padel.
 * Gazon bleu des courts, lignes blanches, balle jaune optique, parois vitrees, grillage.
 * En mode sombre : une session de nuit, terrain eclaire sous les projecteurs.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0D1A33', // encre
    background: '#EDF2F8', // vitre
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#DCE6F4',
    textSecondary: '#5A6A86', // grillage
    primary: '#1F4FA0', // gazon
    onPrimary: '#FFFFFF',
    ball: '#DAF03C', // balle : action principale, attention, "vous"
    onBall: '#0D1A33',
    court: '#1F4FA0',
    courtLine: 'rgba(255, 255, 255, 0.92)',
    border: '#D3DDEA',
    danger: '#D8433A',
    warning: '#A66300',
  },
  dark: {
    text: '#EAF0FA',
    background: '#081226', // nuit
    backgroundElement: '#111F3D',
    backgroundSelected: '#1B2D55',
    textSecondary: '#93A4C2',
    primary: '#5B8DEF',
    onPrimary: '#081226',
    ball: '#DAF03C',
    onBall: '#0D1A33',
    court: '#2458B8',
    courtLine: 'rgba(255, 255, 255, 0.85)',
    border: '#24375F',
    danger: '#FF6B5E',
    warning: '#F0B429',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Polices chargees au demarrage (voir app/_layout.tsx). Sur Android, une police
// personnalisee ne change pas de graisse avec fontWeight : une famille par graisse.
export const FontFamily = {
  display: 'BigShouldersDisplay_800ExtraBold', // titres et chiffres, avec parcimonie
  displayBlack: 'BigShouldersDisplay_900Black',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
  bodyBold: 'InstrumentSans_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    mono: 'monospace',
  },
  web: {
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
