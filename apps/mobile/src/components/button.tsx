import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Bouton en pilule. L'action principale a la couleur de la balle.
export function Button({ title, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = Boolean(disabled) || loading;
  const palette = {
    primary: { backgroundColor: theme.ball, borderColor: theme.ball, color: theme.onBall },
    secondary: { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text },
    danger: { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        <Text style={[styles.label, { color: palette.color }]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
