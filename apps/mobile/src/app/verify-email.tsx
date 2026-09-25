import { verifyEmailSchema } from '@padelteammates/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Spacing } from '@/constants/theme';
import { errorMessage, firstFieldErrors } from '@/lib/api-error';
import { useMeQuery, useSendEmailVerificationMutation, useVerifyEmailMutation } from '@/store/api';

// Saisie du code recu a l'inscription. Cet ecran ne s'impose jamais : on y
// vient depuis le rappel affiche en tete des onglets, et le compte fonctionne
// entierement sans y etre passe.
export default function VerifyEmailScreen() {
  const { data: me } = useMeQuery();
  const [verify, { isLoading: verifying, error: verifyError }] = useVerifyEmailMutation();
  const [resend, { isLoading: resending, error: resendError }] = useSendEmailVerificationMutation();
  const [code, setCode] = useState('');
  const [sentAgain, setSentAgain] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit() {
    const parsed = verifyEmailSchema.safeParse({ code });
    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }
    setFieldErrors({});
    try {
      await verify(parsed.data.code).unwrap();
      router.back();
    } catch {
      // Affichee via `verifyError`.
    }
  }

  async function askAgain() {
    setSentAgain(false);
    try {
      await resend().unwrap();
      setSentAgain(true);
    } catch {
      // Affichee via `resendError`.
    }
  }

  if (me?.emailVerifiedAt) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Adresse confirmée</ThemedText>
          <ThemedText themeColor="textSecondary">
            Votre adresse {me.email} est vérifiée. Vous pourrez retrouver votre compte si vous oubliez
            votre mot de passe.
          </ThemedText>
          <Button title="Fermer" onPress={() => router.back()} />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <ThemedText type="subtitle">Vérifiez votre adresse</ThemedText>
            <ThemedText themeColor="textSecondary">
              Un code à 6 chiffres a été envoyé à {me?.email}. Il est valable 30 minutes. Rien ne vous
              empêche de jouer en attendant.
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

          {verifyError ? <ThemedText themeColor="danger">{errorMessage(verifyError)}</ThemedText> : null}
          {resendError ? <ThemedText themeColor="danger">{errorMessage(resendError)}</ThemedText> : null}
          {sentAgain ? (
            <ThemedText type="small" themeColor="textSecondary">
              Un nouveau code vient d'être envoyé. Le précédent ne fonctionne plus.
            </ThemedText>
          ) : null}

          <Button title="Confirmer mon adresse" onPress={submit} loading={verifying} />
          <Button
            title="Recevoir un nouveau code"
            variant="secondary"
            disabled={resending}
            onPress={askAgain}
          />
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
