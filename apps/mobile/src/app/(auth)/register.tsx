import { registerSchema, slugifyUsername, USERNAME_MIN } from '@padelteammates/shared';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AuthForm } from '@/components/auth-form';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { useCheckUsernameQuery, useRegisterMutation } from '@/store/api';
import { signedIn } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

export default function RegisterScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  // L'identifiant suit le nom saisi, jusqu'a ce que le joueur y touche : sans
  // cela, corriger une faute dans son nom ecraserait l'identifiant choisi.
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Disponibilite interrogee apres une pause de frappe, pas a chaque lettre.
  const [checked, setChecked] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setChecked(username), 400);
    return () => clearTimeout(timer);
  }, [username]);
  const { data: availability } = useCheckUsernameQuery(checked, { skip: checked.length < USERNAME_MIN });
  // La reponse ne vaut que pour ce qui est affiche a l'instant present.
  const verdict = availability && checked === username ? availability : null;

  async function submit() {
    const parsed = registerSchema.safeParse({ name, username, email, password, profilePublic });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      const { token, refreshToken } = await register(parsed.data).unwrap();
      dispatch(signedIn({ token, refreshToken }));
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
          onChangeText={(value) => {
            setName(value);
            if (!usernameEdited) setUsername(slugifyUsername(value));
          }}
          autoComplete="name"
          textContentType="name"
          error={fieldErrors.name}
        />
        <View style={styles.field}>
          <TextField
            label="Identifiant"
            value={username}
            onChangeText={(value) => {
              setUsernameEdited(true);
              setUsername(value.toLowerCase());
            }}
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.username}
          />
          {verdict === null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Il vous distingue des joueurs qui portent le même nom.
            </ThemedText>
          ) : verdict.available ? (
            <ThemedText type="small" themeColor="textSecondary">
              @{username} est libre.
            </ThemedText>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setUsernameEdited(true);
                setUsername(verdict.suggestion);
              }}>
              <ThemedText type="small" themeColor="danger">
                @{username} est déjà pris. Touchez ici pour prendre @{verdict.suggestion}.
              </ThemedText>
            </Pressable>
          )}
        </View>
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
  field: {
    gap: Spacing.one,
  },
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
