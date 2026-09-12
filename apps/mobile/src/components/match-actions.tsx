import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';

import type { Match } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { confirmAction } from '@/lib/confirm';
import { canCancelMatch, canLeaveMatch } from '@/lib/matches';
import { useCancelMatchMutation, useLeaveMatchMutation } from '@/store/api';

// Se retirer d'un match : l'organisateur l'annule, les autres joueurs le quittent.
export function MatchActions({ match, meId }: { match: Match; meId: string }) {
  const [cancelMatch, cancelling] = useCancelMatchMutation();
  const [leaveMatch, leaving] = useLeaveMatchMutation();

  const canCancel = canCancelMatch(match, meId);
  const canLeave = canLeaveMatch(match, meId);
  if (!canCancel && !canLeave) return null;

  const busy = cancelling.isLoading || leaving.isLoading;
  const failure = errorMessage(cancelling.error) ?? errorMessage(leaving.error);

  async function cancel() {
    const confirmed = await confirmAction({
      title: 'Annuler le match ?',
      message: 'Le match disparaît pour tous les joueurs, qui en sont prévenus.',
      confirmLabel: 'Annuler le match',
    });
    if (confirmed) await cancelMatch(match.id);
  }

  async function leave() {
    const confirmed = await confirmAction({
      title: 'Quitter le match ?',
      message: "Votre place redevient libre et l'organisateur en est prévenu.",
      confirmLabel: 'Quitter',
    });
    if (confirmed) await leaveMatch({ matchId: match.id, userId: meId });
  }

  return (
    <View style={styles.actions}>
      {failure ? (
        <ThemedText type="small" themeColor="danger">
          {failure}
        </ThemedText>
      ) : null}
      {canCancel ? <Button title="Annuler le match" variant="danger" disabled={busy} onPress={cancel} /> : null}
      {canLeave ? <Button title="Quitter le match" variant="danger" disabled={busy} onPress={leave} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
  },
});
