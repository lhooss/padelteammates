import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { FrmtCard } from '@/components/frmt-card';
import { InfoRows } from '@/components/info-rows';
import { QueryState } from '@/components/query-state';
import { Screen } from '@/components/screen';
import { StatTiles } from '@/components/stat-tiles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { formatPhone, padelProfileRows } from '@/lib/profile';
import { useLogoutMutation, useMeQuery, useUnlinkFrmtMutation, useUpdateMeMutation } from '@/store/api';
import { signedOut } from '@/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function ProfileScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { data: me, isLoading, error, refetch } = useMeQuery();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const [unlinkFrmt, { isLoading: unlinking }] = useUnlinkFrmtMutation();
  const [logout] = useLogoutMutation();
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);

  // On revoque la session de cet appareil cote serveur avant d'effacer les jetons.
  // Hors ligne ou session deja finie : la deconnexion locale a lieu quand meme.
  async function signOut() {
    if (refreshToken) {
      try {
        await logout(refreshToken).unwrap();
      } catch {
        // Sans importance : le jeton est efface juste apres.
      }
    }
    dispatch(signedOut());
  }

  if (!me) {
    return (
      <Screen>
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  function confirmUnlink() {
    Alert.alert('Retirer votre classement FRMT ?', 'Il ne sera plus affiché sur votre profil.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => void unlinkFrmt() },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText type="subtitle">{me.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{me.email}</ThemedText>
        </View>

        <StatTiles wins={me.wins} losses={me.losses} />

        <View style={styles.section}>
          <SectionTitle>Classement national FRMT</SectionTitle>
          {me.frmt ? (
            <>
              <FrmtCard summary={me.frmt} />
              <View style={styles.actions}>
                <Button
                  title="Changer"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() => router.push('/account/frmt')}
                />
                <Button
                  title="Retirer"
                  variant="danger"
                  style={styles.flex}
                  loading={unlinking}
                  onPress={confirmUnlink}
                />
              </View>
            </>
          ) : (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Licencié à la FRMT ? Retrouvez-vous dans le classement national padel pour l'afficher sur votre
                profil.
              </ThemedText>
              <Button title="Relier mon classement FRMT" variant="secondary" onPress={() => router.push('/account/frmt')} />
            </ThemedView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.flex}>
              <SectionTitle>Profil padel</SectionTitle>
            </View>
            <Button
              title="Modifier"
              variant="secondary"
              style={styles.compact}
              onPress={() => router.push('/account/edit')}
            />
          </View>
          <InfoRows
            rows={[
              ...padelProfileRows(me),
              { label: 'Téléphone (amis)', value: me.phone ? formatPhone(me.phone) : null },
            ]}
          />
        </View>

        <ThemedView type="backgroundElement" style={[styles.card, styles.row]}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">Profil public</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Vos statistiques sont visibles par tous et vous apparaissez au classement. Vos amis les voient
              dans tous les cas.
            </ThemedText>
          </View>
          <Switch
            value={me.profilePublic}
            disabled={saving}
            onValueChange={(value) => {
              void updateMe({ profilePublic: value });
            }}
            trackColor={{ true: theme.primary, false: theme.border }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Profil public"
          />
        </ThemedView>

        <View style={styles.section}>
          {me.role === 'ADMIN' ? (
            <>
              <Button title="Gérer les clubs" variant="secondary" onPress={() => router.push('/admin/clubs')} />
              <Button title="Administration FRMT" variant="secondary" onPress={() => router.push('/admin/frmt')} />
            </>
          ) : null}
          <Button title="Email et mot de passe" variant="secondary" onPress={() => router.push('/account/security')} />
          <Button title="Se déconnecter" variant="danger" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText type="eyebrow" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
});
