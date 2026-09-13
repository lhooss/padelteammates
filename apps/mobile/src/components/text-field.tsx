import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from './themed-text';

import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  // Saisir un mot de passe a l'aveugle sur un telephone est une source d'erreurs :
  // on laisse le choix de l'afficher, masque par defaut.
  const [revealed, setRevealed] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.container}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword && !revealed}
          style={[
            styles.input,
            isPassword ? styles.inputWithAction : null,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: error ? theme.danger : theme.border,
            },
            style,
          ]}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            hitSlop={8}
            onPress={() => setRevealed((current) => !current)}
            style={styles.action}>
            <Text style={[styles.actionLabel, { color: theme.primary }]}>
              {revealed ? 'Masquer' : 'Afficher'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  // Place reservee au bouton, pour que le texte saisi ne passe pas dessous.
  inputWithAction: {
    paddingRight: 86,
  },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
  },
});
