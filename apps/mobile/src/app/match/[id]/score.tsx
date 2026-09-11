import { computeResult, submitScoreSchema, type ScoreResult } from '@padelteammates/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Match, ScoreDetail, Team } from '@/api/types';
import { Button } from '@/components/button';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api-error';
import { useMatchQuery, useMeQuery, useSubmitScoreMutation } from '@/store/api';

// Limites de submitScoreSchema (packages/shared).
const MAX_SETS = 5;
const MAX_GAMES = 10;

type Teams = ScoreDetail['teams'];
type DraftSet = { a: string; b: string };
type DraftGame = { sets: DraftSet[] };

const emptySet = (): DraftSet => ({ a: '', b: '' });

// Saisie (ou correction) du score : composition finale, puis sets de chaque partie.
export default function ScoreEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useMeQuery();
  const { data: match, isLoading, error, refetch } = useMatchQuery(id);

  if (!match || !me) {
    return (
      <ThemedView style={styles.container}>
        <QueryState loading={isLoading || !me} error={errorMessage(error)} onRetry={refetch} />
      </ThemedView>
    );
  }
  return <ScoreForm match={match} meId={me.id} />;
}

// Monte une fois le match charge : l'etat initial en depend (joueurs confirmes,
// ou saisie existante a corriger).
function ScoreForm({ match, meId }: { match: Match; meId: string }) {
  const theme = useTheme();
  const [submitScore, { isLoading, error }] = useSubmitScoreMutation();
  const names = new Map(match.participants.map((p) => [p.userId, p.userId === meId ? 'Vous' : p.user.name]));

  const [teams, setTeams] = useState<Teams>(() => match.score?.setsDetail.teams ?? initialTeams(match));
  const [games, setGames] = useState<DraftGame[]>(() =>
    match.score ? toDraft(match.score.setsDetail) : [{ sets: [emptySet(), emptySet()] }],
  );
  const [selected, setSelected] = useState<{ team: Team; userId: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const complete = games.every((g) => g.sets.every((s) => s.a !== '' && s.b !== ''));
  const parsedGames = games.map((g) => ({ sets: g.sets.map((s) => ({ a: Number(s.a), b: Number(s.b) })) }));
  const body: ScoreDetail = { teams, games: parsedGames };
  const valid = complete && submitScoreSchema.safeParse(body).success;
  const result = valid ? computeResult(body) : null;

  // Echange de deux joueurs : on touche un joueur, puis un joueur de l'autre equipe.
  function pick(team: Team, userId: string) {
    if (!selected || selected.team === team) {
      setSelected(selected?.userId === userId ? null : { team, userId });
      return;
    }
    const from = selected;
    setTeams((prev) => {
      const next: Teams = { A: [...prev.A], B: [...prev.B] };
      next[from.team] = next[from.team].map((id) => (id === from.userId ? userId : id));
      next[team] = next[team].map((id) => (id === userId ? from.userId : id));
      return next;
    });
    setSelected(null);
  }

  function updateGames(update: (games: DraftGame[]) => DraftGame[]) {
    setGames((prev) => update(prev.map((g) => ({ sets: g.sets.map((s) => ({ ...s })) }))));
  }

  function setScore(gi: number, si: number, side: 'a' | 'b', value: string) {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    updateGames((next) => {
      next[gi]!.sets[si]![side] = digit;
      return next;
    });
  }

  async function submit() {
    if (!complete) {
      setFormError('Renseignez le score de chaque set.');
      return;
    }
    // Memes regles que l'API (packages/shared) : 2 contre 2, sets sans egalite, 7 jeux max.
    const parsed = submitScoreSchema.safeParse(body);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Score invalide');
      return;
    }
    setFormError(null);
    try {
      await submitScore({ matchId: match.id, body }).unwrap();
      router.back();
    } catch {
      // Affichee via `error` (ex. creneau pas encore termine).
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {match.score ? (
          <ThemedText type="small" themeColor="warning">
            Vous corrigez le score déjà saisi : les validations repartent de zéro.
          </ThemedText>
        ) : null}

        <Section title="Équipes" hint="Composition réelle du match. Touchez un joueur de chaque équipe pour les échanger.">
          <View style={styles.teams}>
            {(['A', 'B'] as const).map((team) => (
              <View key={team} style={styles.teamColumn}>
                <ThemedText type="small" themeColor="textSecondary">
                  Équipe {team}
                </ThemedText>
                {teams[team].map((userId) => (
                  <Pressable
                    key={userId}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selected?.userId === userId }}
                    onPress={() => pick(team, userId)}
                    style={[
                      styles.player,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: selected?.userId === userId ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText type="small">{names.get(userId) ?? 'Joueur'}</ThemedText>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </Section>

        <Section title="Parties" hint="Nombre de jeux gagnés dans chaque set : équipe A – équipe B.">
          {games.map((game, gi) => (
            <ThemedView key={gi} type="backgroundElement" style={styles.game}>
              <View style={styles.gameHeader}>
                <ThemedText type="smallBold">Partie {gi + 1}</ThemedText>
                {games.length > 1 ? (
                  <Pressable hitSlop={8} onPress={() => updateGames((next) => next.filter((_, i) => i !== gi))}>
                    <ThemedText type="small" themeColor="danger">
                      Supprimer
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>

              {game.sets.map((set, si) => (
                <View key={si} style={styles.setRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.setLabel}>
                    Set {si + 1}
                  </ThemedText>
                  <GamesInput
                    value={set.a}
                    label={`Partie ${gi + 1}, set ${si + 1}, jeux de l'équipe A`}
                    onChange={(v) => setScore(gi, si, 'a', v)}
                  />
                  <ThemedText type="smallBold">–</ThemedText>
                  <GamesInput
                    value={set.b}
                    label={`Partie ${gi + 1}, set ${si + 1}, jeux de l'équipe B`}
                    onChange={(v) => setScore(gi, si, 'b', v)}
                  />
                  {game.sets.length > 1 ? (
                    <Pressable
                      hitSlop={8}
                      accessibilityLabel={`Retirer le set ${si + 1}`}
                      onPress={() =>
                        updateGames((next) => {
                          next[gi]!.sets.splice(si, 1);
                          return next;
                        })
                      }>
                      <ThemedText themeColor="textSecondary">✕</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {game.sets.length < MAX_SETS ? (
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    updateGames((next) => {
                      next[gi]!.sets.push(emptySet());
                      return next;
                    })
                  }>
                  <ThemedText type="small" themeColor="primary">
                    + Ajouter un set
                  </ThemedText>
                </Pressable>
              ) : null}
            </ThemedView>
          ))}

          {games.length < MAX_GAMES ? (
            <Button
              title="+ Ajouter une partie"
              variant="secondary"
              onPress={() => updateGames((next) => [...next, { sets: [emptySet(), emptySet()] }])}
            />
          ) : null}
        </Section>

        <ThemedView type="backgroundElement" style={styles.summary}>
          <ThemedText type="smallBold">Résultat</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {result ? describe(result, teams, names) : 'Complétez les scores pour voir le résultat.'}
          </ThemedText>
        </ThemedView>

        {formError || error ? <ThemedText themeColor="danger">{formError ?? errorMessage(error)}</ThemedText> : null}
        <Button title="Enregistrer le score" onPress={submit} loading={isLoading} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Le score est verrouillé dès qu'un joueur de l'équipe adverse l'a validé.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function GamesInput({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="number-pad"
      maxLength={1}
      selectTextOnFocus
      placeholder="–"
      placeholderTextColor={theme.textSecondary}
      accessibilityLabel={label}
      style={[styles.gamesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
    />
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

// Joueurs confirmes, dans l'equipe choisie a l'invitation.
function initialTeams(match: Match): Teams {
  const confirmed = match.participants.filter((p) => p.presenceStatus === 'CONFIRMED');
  return {
    A: confirmed.filter((p) => p.team === 'A').map((p) => p.userId),
    B: confirmed.filter((p) => p.team === 'B').map((p) => p.userId),
  };
}

function toDraft(detail: ScoreDetail): DraftGame[] {
  return detail.games.map((g) => ({ sets: g.sets.map((s) => ({ a: String(s.a), b: String(s.b) })) }));
}

// "Équipe A (Vous et Youssef) gagne 2 parties à 1."
function describe(result: ScoreResult, teams: Teams, names: Map<string, string>): string {
  if (result.winningTeam === null) return 'Égalité : aucune victoire ne sera comptée.';
  const winner = result.winningTeam;
  const players = teams[winner].map((id) => names.get(id) ?? 'Joueur').join(' et ');
  if (result.gamesPlayed === 1) return `Équipe ${winner} (${players}) gagne la partie.`;
  const won = Math.max(result.gamesWonA, result.gamesWonB);
  const lost = Math.min(result.gamesWonA, result.gamesWonB);
  return `Équipe ${winner} (${players}) gagne ${won} parties à ${lost}.`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  teams: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  teamColumn: {
    flex: 1,
    gap: Spacing.two,
  },
  player: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  game: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  setLabel: {
    width: 48,
  },
  gamesInput: {
    width: 48,
    height: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 600,
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  note: {
    textAlign: 'center',
  },
});
