import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'eyebrow' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = type === 'linkPrimary' && !themeColor ? theme.primary : theme[themeColor ?? 'text'];

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  // Titre d'affichage : condense, capitales, comme les panneaux d'un court.
  title: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: FontFamily.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.3,
  },
  small: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  // Etiquette courte en capitales espacees (libelles, categories).
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 30,
  },
  linkPrimary: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 30,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
