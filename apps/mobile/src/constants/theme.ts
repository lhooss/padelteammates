/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1B17',
    background: '#FFFFFF',
    backgroundElement: '#F0F4F2',
    backgroundSelected: '#DCE8E3',
    textSecondary: '#5B6763',
    primary: '#0E7C66',
    onPrimary: '#FFFFFF',
    border: '#D3DDD9',
    danger: '#C2362B',
    warning: '#9A5B00',
  },
  dark: {
    text: '#F2F7F5',
    background: '#0A0F0D',
    backgroundElement: '#17201D',
    backgroundSelected: '#223029',
    textSecondary: '#A3B1AC',
    primary: '#3CC19E',
    onPrimary: '#04231B',
    border: '#2A3833',
    danger: '#FF6B5E',
    warning: '#F0B429',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
