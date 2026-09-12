import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';

import type { Match } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/api-error';
import { isParticipant } from '@/lib/matches';
import { useSetCourtBookingMutation } from '@/store/api';

// Reservation du terrain : elle se fait aupres du club, au telephone ou sur place.
// N'importe quel joueur du match confirme ici que c'est fait, pour que les autres
// n'aient pas a demander.
export function CourtBooking({ match, meId }: { match: Match; meId: string }) {
  const [setCourtBooking, { isLoading, error }] = useSetCourtBookingMutation();
  if (match.status !== 'PLANNED' || !isParticipant(match, meId)) return null;

  const booked = Boolean(match.courtBookedAt);
  const bookedBy = match.participants.find((p) => p.userId === match.courtBookedById)?.user.name;

  return (
    <View style={styles.booking}>
      <ThemedText type="small" themeColor="textSecondary">
        {booked
          ? `Terrain réservé${bookedBy ? ` par ${bookedBy}` : ''}.`
          : "Le terrain n'est pas encore réservé au club."}
      </ThemedText>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {errorMessage(error)}
        </ThemedText>
      ) : null}
      <Button
        title={booked ? 'Retirer la réservation' : "J'ai réservé le terrain"}
        variant="secondary"
        disabled={isLoading}
        onPress={() => setCourtBooking({ matchId: match.id, booked: !booked })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  booking: {
    gap: Spacing.two,
  },
});
