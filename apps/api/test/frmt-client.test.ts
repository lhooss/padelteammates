import { describe, expect, it } from 'vitest';
import { fetchFrmtCategory, FrmtError, parseFrmtTable } from '../src/services/frmt.client.js';

// XML au format de la table WebDev de la FRMT (joueurs fictifs).
function tableXml(total: number, rows: [rank: string, evolution: string, label: string, points: string][]): string {
  const lines = rows
    .map(
      ([rank, evolution, label, points], i) =>
        `<LIGNE NUMERO="${i}" POSABSOLUE="${i}"><COLONNE/><COLONNE>${rank}</COLONNE><COLONNE/>` +
        `<COLONNE COULEUR="#000000">${evolution}</COLONNE>` +
        `<COLONNE><DEBUT></DEBUT><CORPS><![CDATA[<div><img src="drapeau.png" alt=""></div>]]></CORPS><FIN></FIN></COLONNE>` +
        `<COLONNE>MAR</COLONNE><COLONNE>${label}</COLONNE><COLONNE/><COLONNE/><COLONNE/><COLONNE/><COLONNE/>` +
        `<COLONNE COULEUR="#000000">+12</COLONNE><COLONNE/><COLONNE>${points}</COLONNE></LIGNE>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="utf-8" ?><WAJAX><LISTE NOMBRE="${total}" FIN="1" TYPE="9"><COLONNES/><LIGNES>${lines}</LIGNES></LISTE></WAJAX>`;
}

describe('Classement FRMT — lecture de la table', () => {
  it('extrait rang, evolution, nom, annee, club, nationalite et points', () => {
    const { total, rows } = parseFrmtTable(
      tableXml(3, [
        ['1', '-', 'BENNANI YOUSSEF [2001] (IND)', '23 100,0'],
        ['2', '+3', 'EL AMRANI SAMI [1995] (COC)', '6 413,5'],
        ['2', '-12', 'O&apos;NEIL KARIM [1988] (TCF)', '950,0'],
      ]),
    );
    expect(total).toBe(3);
    expect(rows).toEqual([
      { rank: 1, evolution: null, fullName: 'BENNANI YOUSSEF', birthYear: 2001, club: 'IND', nationality: 'MAR', points: 23100 },
      { rank: 2, evolution: 3, fullName: 'EL AMRANI SAMI', birthYear: 1995, club: 'COC', nationality: 'MAR', points: 6413.5 },
      { rank: 2, evolution: -12, fullName: "O'NEIL KARIM", birthYear: 1988, club: 'TCF', nationality: 'MAR', points: 950 },
    ]);
  });

  it('lit les rangs au-dela du millier, separes par une espace insecable', () => {
    // Le site ecrit "1 001" avec une espace insecable (et l'espace fine pour
    // l'evolution). Le rang n'etait alors pas reconnu et toute la ligne etait
    // rejetee : l'import s'arretait de fait au millieme joueur.
    const { rows } = parseFrmtTable(
      tableXml(2, [
        ['1 001', '+1 024', 'TAZI OMAR [1999] (IND)', '120,5'],
        ['1 002', '-', 'IDRISSI AMINE [2003] (COC)', '119,0'],
      ]),
    );
    expect(rows.map((r) => [r.rank, r.evolution])).toEqual([
      [1001, 1024],
      [1002, null],
    ]);
  });

  it('ignore les lignes illisibles et renvoie 0 sans table', () => {
    expect(parseFrmtTable(tableXml(1, [['1', '-', 'SANS ANNEE NI CLUB', '10,0']])).rows).toEqual([]);
    expect(parseFrmtTable('<WAJAX></WAJAX>')).toEqual({ total: 0, rows: [] });
  });
});

describe('Classement FRMT — dialogue avec la page', () => {
  // Faux site FRMT : page avec formulaire, evenement de filtre, lignes paginees par 100.
  function fakeFrmt(pagesByRange: Record<string, string[]>) {
    const calls: string[] = [];
    let range = '0';
    const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
      const body = String(init?.body ?? '');
      calls.push(init?.method === 'POST' ? body.slice(0, 60) : 'GET');
      if (!init?.method) {
        return new Response(
          '<form name="P" action="/FRMT/PAGE/ctx"><select name="A16"><option value="1" selected>Messieurs</option><option value="2">Dames</option></select><select name="A18"><option value="1">Top 100</option></select></form>',
          { headers: { 'set-cookie': 'SESSION=abc; path=/' } },
        );
      }
      if (body.includes('EXECUTE=47')) {
        range = new URLSearchParams(body).get('A18') ?? '0';
        return new Response('<WAJAX><CHAMP ALIAS="A7"><REFRESH RESETTABLE="1"/></CHAMP></WAJAX>');
      }
      const start = Number(/LIGNESTABLE=A7&(\d+)=/.exec(body)?.[1]);
      const pages = pagesByRange[range] ?? [];
      return new Response(pages[start / 100] ?? tableXml(0, []));
    }) as typeof fetch;
    return { fetchImpl, calls };
  }

  const player = (rank: number): [string, string, string, string] => [String(rank), '-', `JOUEUR ${rank} [2000] (IND)`, '100,0'];

  it('parcourt les tranches et les pages, puis s\'arrete a la premiere tranche vide', async () => {
    const first100 = Array.from({ length: 100 }, (_, i) => player(i + 1));
    const { fetchImpl, calls } = fakeFrmt({
      // Tranche 1 : 101 joueurs (ex-aequo), donc 2 pages ; tranche 2 : 1 joueur deja vu + 1 nouveau.
      '1': [tableXml(101, first100), tableXml(101, [player(101)])],
      '2': [tableXml(2, [player(101), player(102)])],
    });

    const rows = await fetchFrmtCategory('MEN', { fetchImpl, delayMs: 0 });
    expect(rows).toHaveLength(102);
    expect(rows.at(-1)?.fullName).toBe('JOUEUR 102');
    // GET, puis tranche 1 (evenement + 2 pages), tranche 2 (evenement + 1 page), tranche 3 vide.
    expect(calls.filter((c) => c.includes('EXECUTE=47'))).toHaveLength(3);
  });

  it('signale une erreur du serveur FRMT au lieu d\'importer du vide', async () => {
    const fetchImpl = (async (_url: string | URL, init?: RequestInit) =>
      init?.method
        ? new Response('<html><h2>Un problème technique est survenu</h2>La session n\'existe plus</html>')
        : new Response('<form action="/FRMT/PAGE/ctx"></form>')) as typeof fetch;
    await expect(fetchFrmtCategory('WOMEN', { fetchImpl, delayMs: 0 })).rejects.toBeInstanceOf(FrmtError);
  });
});
