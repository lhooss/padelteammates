import { describe, expect, it } from 'vitest';

import type { Match, Participant, PresenceStatus, Team } from '@/api/types';
import { hasSlotEnded, isAbandoned } from '@/lib/matches';

const ME = 'me';
const CLUB = { id: 'club', name: 'Elite Padel Club Kenitra', city: 'Kénitra', active: true };
// Jour du match : minuit UTC, comme le renvoie l'API.
const DAY = '2026-09-20T00:00:00.000Z';

function player(userId: string, team: Team, presenceStatus: PresenceStatus = 'CONFIRMED'): Participant {
  return {
    id: `p-${userId}`,
    userId,
    matchId: 'match',
    team,
    presenceStatus,
    user: { id: userId, name: userId, username: userId },
  };
}

// Par defaut : deux joueurs seulement, le cas d'un match qui n'a jamais fait le plein.
function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match',
    date: DAY,
    slot: '18:00-19:30',
    status: 'PLANNED',
    visibility: 'PUBLIC',
    clubId: CLUB.id,
    createdById: 'organisateur',
    courtBookedAt: null,
    courtBookedById: null,
    club: CLUB,
    participants: [player(ME, 'A'), player('organisateur', 'A')],
    ...overrides,
  };
}

// L'heure locale du telephone fait foi (les joueurs sont a Kenitra) : les
// instants de reference sont donc construits en heure locale, comme le code teste.
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);

describe('isAbandoned — creneau passe sans resultat possible', () => {
  it("un match reste a deux joueurs, dont le creneau est passe, est sans suite", () => {
    // Le cas signale : jamais quatre joueurs, date depassee, et le match
    // figurait indefiniment dans "A venir".
    expect(isAbandoned(match(), ME, at(20, 20))).toBe(true);
  });

  it("un match dont le creneau n'est pas termine reste a venir", () => {
    expect(isAbandoned(match(), ME, at(20, 18, 30))).toBe(false);
  });

  it('un match complet dont le creneau est passe attend un score', () => {
    // Quatre joueurs confirmes : il y a un resultat a saisir, donc une action
    // a mener. Ce match appartient a "A traiter", pas a "Sans suite".
    const complet = match({
      participants: [player(ME, 'A'), player('b', 'A'), player('c', 'B'), player('d', 'B')],
    });
    expect(isAbandoned(complet, ME, at(20, 20))).toBe(false);
  });

  it("une invitation restee sans reponse n'est pas sans suite", () => {
    // Elle appartient a la section "Invitations" : c'est au joueur de trancher.
    const invite = match({ participants: [player(ME, 'A', 'INVITED'), player('organisateur', 'A')] });
    expect(isAbandoned(invite, ME, at(20, 20))).toBe(false);
  });

  it("un match termine n'est pas sans suite", () => {
    expect(isAbandoned(match({ status: 'COMPLETED' }), ME, at(20, 20))).toBe(false);
  });

  it("un score en attente de validation n'est pas sans suite", () => {
    // Statut PENDING : le match a bien eu lieu, son resultat circule.
    expect(isAbandoned(match({ status: 'PENDING' }), ME, at(20, 20))).toBe(false);
  });
});

describe('hasSlotEnded — creneau tardif qui franchit minuit', () => {
  const tardif = () => match({ slot: '23:00-00:30' });

  it("23:00-00:30 n'est pas termine a 23h45 le soir meme", () => {
    expect(hasSlotEnded(tardif(), at(20, 23, 45))).toBe(false);
    expect(isAbandoned(tardif(), ME, at(20, 23, 45))).toBe(false);
  });

  it('23:00-00:30 est termine a 1h du matin le lendemain', () => {
    expect(hasSlotEnded(tardif(), at(21, 1))).toBe(true);
    expect(isAbandoned(tardif(), ME, at(21, 1))).toBe(true);
  });

  it('un creneau ordinaire se termine a la minute annoncee', () => {
    expect(hasSlotEnded(match(), at(20, 19, 29))).toBe(false);
    expect(hasSlotEnded(match(), at(20, 19, 30))).toBe(true);
  });
});
