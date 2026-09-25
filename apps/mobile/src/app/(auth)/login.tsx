import { loginSchema } from '@padelteammates/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { useLoginMutation } from '@/store/api';
import { signedIn } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

export default function LoginScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit() {
    // Meme schema Zod que l'API (packages/shared) : on valide avant tout appel reseau.
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      const { token, refreshToken } = await login(parsed.data).unwrap();
      dispatch(signedIn({ token, refreshToken }));
    } catch {
      // Affichee via `error`.
    }
  }

  return (
    <Screen edges={['bottom']}>
      <AuthForm title="Connexion" subtitle="Retrouvez vos matchs, vos amis et votre classement.">
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={fieldErrors.email}
        />
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
          error={fieldErrors.password}
        />
        {error ? <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText> : null}
        <Button title="Se connecter" onPress={submit} loading={isLoading} />
        <Link href="/forgot-password" style={[styles.link, { color: theme.primary }]}>
          Mot de passe oublié ?
        </Link>
        <Link href="/register" style={[styles.link, { color: theme.primary }]}>
          Pas encore de compte ? Créer un compte
        </Link>
      </AuthForm>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    textAlign: 'center',
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    paddingVertical: 8,
  },
});
