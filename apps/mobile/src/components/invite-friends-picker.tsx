import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Chip } from './chip';
import { ThemedText } from './themed-text';

import type { PlayerSummary, Team } from '@/api/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InviteRole = 'partner' | 'opponent';
export type InviteRoles = Record<string, InviteRole>;

const ROLE_LABEL: Record<InviteRole, string> = { partner: 'Partenaire', opponent: 'Adversaire' };

// Choix des amis a inviter : partenaire (equipe de l'organisateur) ou adversaire,
// dans la limite des places libres de chaque cote.
export function InviteFriendsPicker({
  friends,
  roles,
  onChange,
  capacity,
}: {
  friends: PlayerSummary[];
  roles: InviteRoles;
  onChange: (roles: InviteRoles) => void;
  capacity: Record<InviteRole, number>;
}) {
  const theme = useTheme();
  const chosen = (role: InviteRole) => Object.values(roles).filter((r) => r === role).length;

  function toggle(friendId: string, role: InviteRole) {
    const next = { ...roles };
    if (next[friendId] === role) delete next[friendId];
    else next[friendId] = role;
    onChange(next);
  }

  if (friends.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Aucun ami disponible à inviter.{' '}
        <Link href="/friends" style={{ color: theme.primary }}>
          Trouver des joueurs
        </Link>
      </ThemedText>
    );
  }

  return (
    <View style={styles.list}>
      {friends.map((friend) => (
        <View key={friend.id} style={styles.row}>
          <ThemedText type="small" style={styles.name}>
            {friend.name}
          </ThemedText>
          {(['partner', 'opponent'] as const)
            .filter((role) => capacity[role] > 0)
            .map((role) => (
              <Chip
                key={role}
                label={ROLE_LABEL[role]}
                selected={roles[friend.id] === role}
                disabled={roles[friend.id] !== role && chosen(role) >= capacity[role]}
                onPress={() => toggle(friend.id, role)}
              />
            ))}
        </View>
      ))}
    </View>
  );
}

// Roles choisis -> invitations pour l'API, relativement a l'equipe de l'organisateur.
export function toInvites(roles: InviteRoles, organizerTeam: Team): { userId: string; team: Team }[] {
  const otherTeam: Team = organizerTeam === 'A' ? 'B' : 'A';
  return Object.entries(roles).map(([userId, role]) => ({
    userId,
    team: role === 'partner' ? organizerTeam : otherTeam,
  }));
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
});
