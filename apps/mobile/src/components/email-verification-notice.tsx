import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMeQuery } from '@/store/api';

// Rappel tant que l'adresse n'est pas confirmee. C'est un rappel, pas un
// barrage : le joueur organise ses matchs sans avoir rien a faire ici. Affiche
// dans l'en-tete commun, il apparait donc au meme endroit sur tous les onglets
// et disparait de lui-meme des la verification faite.
export function EmailVerificationNotice() {
  const theme = useTheme();
  const { data: me } = useMeQuery();
  if (!me || me.emailVerifiedAt) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Vérifier mon adresse e-mail"
      onPress={() => router.push('/verify-email')}
      style={({ pressed }) => [styles.banner, { backgroundColor: theme.ball, opacity: pressed ? 0.85 : 1 }]}>
      <ThemedText type="smallBold" themeColor="onBall">
        Vérifiez votre adresse e-mail
      </ThemedText>
      <ThemedText type="small" themeColor="onBall">
        Touchez ici pour saisir le code reçu. Vous pourrez ainsi retrouver votre compte en cas d'oubli
        de mot de passe.
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
});
