import { forgotPasswordSchema, resetPasswordSchema } from '@padelteammates/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Spacing } from '@/constants/theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/store/api';

// Deux etapes dans un seul ecran : on demande le code, puis on le saisit sans
// naviguer. Le joueur a le code sous les yeux dans sa boite mail, le lui faire
// retenir d'un ecran a l'autre serait une source d'erreurs.
export default function ForgotPasswordScreen() {
  const [sendCode, { isLoading: sending, error: sendError }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetting, error: resetError }] = useResetPasswordMutation();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function askForCode() {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      await sendCode(parsed.data.email).unwrap();
      setCodeSent(true);
    } catch {
      // Affichee via `sendError`.
    }
  }

  async function submitNewPassword() {
    const parsed = resetPasswordSchema.safeParse({ email, code, newPassword });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      await resetPassword(parsed.data).unwrap();
      setDone(true);
    } catch {
      // Affichee via `resetError`.
    }
  }

  if (done) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Mot de passe modifié</ThemedText>
          <ThemedText themeColor="textSecondary">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe. Vos autres
            appareils ont été déconnectés.
          </ThemedText>
          <Button title="Se connecter" onPress={() => router.replace('/login')} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {codeSent ? (
            <>
              <View style={styles.heading}>
                <ThemedText type="subtitle">Votre code</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Si un compte existe pour {email}, un code à 6 chiffres vient d'y être envoyé.
                  Il est valable 15 minutes.
                </ThemedText>
              </View>

              <TextField
                label="Code reçu par email"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={styles.code}
                error={fieldErrors.code}
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

              {resetError ? <ThemedText themeColor="danger">{errorMessage(resetError)}</ThemedText> : null}
              <Button title="Changer mon mot de passe" onPress={submitNewPassword} loading={resetting} />
              <Button
                title="Recevoir un nouveau code"
                variant="secondary"
                disabled={sending}
                onPress={askForCode}
              />
            </>
          ) : (
            <>
              <View style={styles.heading}>
                <ThemedText type="subtitle">Mot de passe oublié</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Indiquez l'adresse de votre compte : vous recevrez un code pour choisir un
                  nouveau mot de passe.
                </ThemedText>
              </View>

              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                onSubmitEditing={askForCode}
                error={fieldErrors.email}
              />

              {sendError ? <ThemedText themeColor="danger">{errorMessage(sendError)}</ThemedText> : null}
              <Button title="Recevoir un code" onPress={askForCode} loading={sending} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  heading: {
    gap: Spacing.one,
  },
  // Un code se lit chiffre par chiffre : on l'espace et on l'agrandit.
  code: {
    fontFamily: FontFamily.display,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
  },
});
