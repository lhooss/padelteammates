import { Alert, StyleSheet, View } from 'react-native';

import { Button } from './button';

import type { FriendshipState } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import {
  useAcceptFriendRequestMutation,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
} from '@/store/api';

// Bouton(s) d'amitie selon la relation : ajouter, annuler, accepter / refuser, retirer.
// `compact` (listes) : pas de bouton "Retirer" pour un ami.
export function FriendAction({
  userId,
  name,
  state,
  compact = false,
}: {
  userId: string;
  name: string;
  state: FriendshipState;
  compact?: boolean;
}) {
  const [send, sending] = useSendFriendRequestMutation();
  const [accept, accepting] = useAcceptFriendRequestMutation();
  const [remove, removing] = useRemoveFriendMutation();
  const busy = sending.isLoading || accepting.isLoading || removing.isLoading;

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (err) {
      Alert.alert('Action impossible', errorMessage(err as Parameters<typeof errorMessage>[0]) ?? undefined);
    }
  }

  const buttonStyle = compact ? styles.compact : undefined;

  switch (state) {
    case 'NONE':
      return (
        <Button title="Ajouter" style={buttonStyle} loading={busy} onPress={() => run(() => send(userId).unwrap())} />
      );
    case 'REQUEST_SENT':
      return (
        <Button
          title={compact ? 'Annuler' : 'Annuler la demande'}
          variant="secondary"
          style={buttonStyle}
          loading={busy}
          onPress={() => run(() => remove(userId).unwrap())}
        />
      );
    case 'REQUEST_RECEIVED':
      return (
        <View style={styles.row}>
          <Button
            title="Refuser"
            variant="secondary"
            style={buttonStyle}
            disabled={busy}
            onPress={() => run(() => remove(userId).unwrap())}
          />
          <Button title="Accepter" style={buttonStyle} disabled={busy} onPress={() => run(() => accept(userId).unwrap())} />
        </View>
      );
    case 'FRIENDS':
      if (compact) return null;
      return (
        <Button
          title="Retirer de mes amis"
          variant="danger"
          loading={busy}
          onPress={() =>
            Alert.alert(`Retirer ${name} de vos amis ?`, 'Vous ne pourrez plus l\'inviter à vos matchs.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Retirer', style: 'destructive', onPress: () => void run(() => remove(userId).unwrap()) },
            ])
          }
        />
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
});
