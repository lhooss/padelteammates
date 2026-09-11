import { changeEmailSchema, changePasswordSchema } from '@padelteammates/shared';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { useChangeEmailMutation, useChangePasswordMutation, useMeQuery } from '@/store/api';

// Changer d'email ou de mot de passe, en confirmant avec le mot de passe actuel.
export default function SecurityScreen() {
  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <EmailForm />
          <PasswordForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function EmailForm() {
  const { data: me } = useMeQuery();
  const [changeEmail, { isLoading, error }] = useChangeEmailMutation();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit() {
    const parsed = changeEmailSchema.safeParse({ email, currentPassword });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      const user = await changeEmail(parsed.data).unwrap();
      setEmail('');
      setCurrentPassword('');
      Alert.alert('Email modifié', `Vous vous connecterez désormais avec ${user.email}.`);
    } catch {
      // Affichee via `error`.
    }
  }

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Changer d'email</ThemedText>
      {me ? (
        <ThemedText type="small" themeColor="textSecondary">
          Email actuel : {me.email}
        </ThemedText>
      ) : null}
      <TextField
        label="Nouvel email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <TextField
        label="Mot de passe actuel"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoComplete="current-password"
        error={fieldErrors.currentPassword}
      />
      {error ? <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText> : null}
      <Button title="Changer d'email" onPress={submit} loading={isLoading} />
    </View>
  );
}

function PasswordForm() {
  const [changePassword, { isLoading, error }] = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit() {
    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    if (newPassword !== confirmation) {
      setFieldErrors({ confirmation: 'Les deux mots de passe ne correspondent pas' });
      return;
    }
    setFieldErrors({});
    try {
      await changePassword(parsed.data).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      Alert.alert('Mot de passe modifié', 'Utilisez-le à votre prochaine connexion.');
    } catch {
      // Affichee via `error`.
    }
  }

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Changer de mot de passe</ThemedText>
      <TextField
        label="Mot de passe actuel"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoComplete="current-password"
        error={fieldErrors.currentPassword}
      />
      <TextField
        label="Nouveau mot de passe"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={fieldErrors.newPassword}
      />
      <TextField
        label="Confirmer le nouveau mot de passe"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
        error={fieldErrors.confirmation}
      />
      {error ? <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText> : null}
      <Button title="Changer de mot de passe" onPress={submit} loading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.six,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.three,
  },
});
