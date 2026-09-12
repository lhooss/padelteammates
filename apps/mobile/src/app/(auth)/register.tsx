import { registerSchema } from '@padelteammates/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { useRegisterMutation } from '@/store/api';
import { signedIn } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

export default function RegisterScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit() {
    const parsed = registerSchema.safeParse({ name, email, password, profilePublic });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      const { token } = await register(parsed.data).unwrap();
      dispatch(signedIn(token));
    } catch {
      // Affichee via `error`.
    }
  }

  return (
    <Screen edges={['bottom']}>
      <AuthForm title="Créer un compte" subtitle="Organisez vos matchs et suivez vos statistiques.">
        <TextField
          label="Nom"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          error={fieldErrors.name}
        />
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
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.password}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <ThemedText type="smallBold">Profil public</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Vos statistiques et votre place au classement sont visibles par la communauté.
            </ThemedText>
          </View>
          <Switch
            value={profilePublic}
            onValueChange={setProfilePublic}
            trackColor={{ true: theme.primary, false: theme.border }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Profil public"
          />
        </View>
        {error ? <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText> : null}
        <Button title="Créer mon compte" onPress={submit} loading={isLoading} />
        <Link href="/login" style={[styles.link, { color: theme.primary }]}>
          Déjà inscrit ? Se connecter
        </Link>
      </AuthForm>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
  },
  link: {
    textAlign: 'center',
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    paddingVertical: 8,
  },
});
