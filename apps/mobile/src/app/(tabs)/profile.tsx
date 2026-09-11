import { router } from 'expo-router';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoRows } from '@/components/info-rows';
import { QueryState } from '@/components/query-state';
import { Screen } from '@/components/screen';
import { StatTiles } from '@/components/stat-tiles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { formatPhone, padelProfileRows } from '@/lib/profile';
import { useMeQuery, useUpdateMeMutation } from '@/store/api';
import { signedOut } from '@/store/auth-slice';
import { useAppDispatch } from '@/store/hooks';

export default function ProfileScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { data: me, isLoading, error, refetch } = useMeQuery();
  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();

  if (!me) {
    return (
      <Screen>
        <QueryState loading={isLoading} error={errorMessage(error)} onRetry={refetch} />
      </Screen>
    );
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
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.flex}>
              Profil padel
            </ThemedText>
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

        <ThemedView type="backgroundElement" style={styles.row}>
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
            trackColor={{ true: theme.primary }}
            accessibilityLabel="Profil public"
          />
        </ThemedView>

        <Button title="Email et mot de passe" variant="secondary" onPress={() => router.push('/account/security')} />
        <Button title="Se déconnecter" variant="danger" onPress={() => dispatch(signedOut())} />
      </ScrollView>
    </Screen>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
});
