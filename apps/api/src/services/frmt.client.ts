import type { FrmtCategory } from '@padelteammates/shared';

// Client du classement national padel de la FRMT :
//   https://info2.frmt.ma/FRMT_CLASSEMENT_WB27?Type=P
// La page est publique (WebDev) mais sans API. On rejoue ses requetes AJAX, comme un navigateur :
//   1. GET de la page : cookie de session, URL d'action du formulaire, valeurs par defaut des filtres ;
//   2. evenement "changement" du filtre de tranche : WD_ACTION_=AJAXCHAMP, EXECUTE=47, WD_CONTEXTE_=A18 ;
//   3. lignes de la table A7 en XML : WD_ACTION_=AJAXEXECUTE&LIGNESTABLE=A7&<debut>=<nombre>.
// Une requete mal formee ferme la session WebDev : on ouvre une session par categorie.
// Si la FRMT modifie sa page, on echoue avec une erreur explicite plutot que d'importer du vide.

export interface FrmtRow {
  rank: number;
  evolution: number | null; // places gagnees (+) ou perdues (-) ; null si inchange
  fullName: string; // "NOM PRENOM", tel que publie
  birthYear: number | null;
  club: string | null; // code club FRMT, ex. "COC"
  nationality: string | null; // ex. "MAR"
  points: number;
}

export class FrmtError extends Error {}

const PAGE_URL = 'https://info2.frmt.ma/FRMT_CLASSEMENT_WB27?Type=P';
const USER_AGENT = 'Padelteammates/0.1 (import du classement national padel)';
const CATEGORY_FILTER: Record<FrmtCategory, string> = { MEN: '1', WOMEN: '2' }; // filtre A16
const RANGE_COUNT = 25; // filtre A18 : Top 100, 101-200, ..., 2401-2500
const PAGE_SIZE = 100; // lignes renvoyees au plus par requete

export interface FrmtClientOptions {
  fetchImpl?: typeof fetch;
  delayMs?: number; // pause entre deux requetes, par politesse envers le site de la FRMT
}

interface Session {
  defaults: Record<string, string>;
  post(body: string): Promise<string>;
}

async function openSession(fetchImpl: typeof fetch): Promise<Session> {
  const page = await fetchImpl(PAGE_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!page.ok) throw new FrmtError(`Page du classement FRMT indisponible (HTTP ${page.status})`);
  const cookie = page.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const html = await page.text();
  const action = /<form[^>]*action="([^"]+)"/i.exec(html)?.[1];
  if (!action) throw new FrmtError('Formulaire du classement introuvable : la page FRMT a change');
  const actionUrl = new URL(action, page.url || PAGE_URL).href;

  // Valeur par defaut de chaque filtre : option selectionnee, sinon la premiere.
  const defaults: Record<string, string> = {};
  for (const select of html.matchAll(/<select([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = /name="?([^"\s>]+)/i.exec(select[1] ?? '')?.[1];
    const options = [...(select[2] ?? '').matchAll(/<option([^>]*)>/gi)].map((o) => ({
      value: /value="?([^"\s>]+)/i.exec(o[1] ?? '')?.[1],
      selected: /selected/i.test(o[1] ?? ''),
    }));
    const chosen = options.find((o) => o.selected) ?? options[0];
    if (name && chosen?.value) defaults[name] = chosen.value;
  }

  return {
    defaults,
    async post(body) {
      const res = await fetchImpl(actionUrl, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: cookie,
          Referer: page.url,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const text = await res.text();
      if (/probl.me technique est survenu/i.test(text)) {
        const detail = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
        throw new FrmtError(`Erreur du serveur FRMT : ${detail}`);
      }
      return text;
    },
  };
}

// Classement complet d'une categorie, tranche par tranche, jusqu'a une tranche vide.
export async function fetchFrmtCategory(category: FrmtCategory, options: FrmtClientOptions = {}): Promise<FrmtRow[]> {
  const { fetchImpl = fetch, delayMs = 400 } = options;
  const pause = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  const session = await openSession(fetchImpl);
  const rows: FrmtRow[] = [];

  for (let range = 1; range <= RANGE_COUNT; range++) {
    await pause();
    const filters = { ...session.defaults, A16: CATEGORY_FILTER[category], A18: String(range) };
    await session.post(
      new URLSearchParams({ WD_ACTION_: 'AJAXCHAMP', EXECUTE: '47', WD_CONTEXTE_: 'A18', ...filters }).toString(),
    );

    // Les lignes de la tranche, par pages de 100 (une tranche peut en compter plus, ex-aequo).
    const tranche: FrmtRow[] = [];
    for (let start = 0; ; start += PAGE_SIZE) {
      await pause();
      const { total, rows: page } = parseFrmtTable(
        await session.post(`WD_ACTION_=AJAXEXECUTE&LIGNESTABLE=A7&${start}=${PAGE_SIZE}`),
      );
      tranche.push(...page);
      if (page.length === 0 || tranche.length >= total) break;
    }
    if (tranche.length === 0) break;
    rows.push(...tranche);
  }

  // Les tranches peuvent se chevaucher (ex-aequo) : une ligne par joueur.
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.fullName}|${row.birthYear}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Lecture du XML de la table (fonction pure, testee sans reseau) ---

// "NOM PRENOM [2002] (IND)" : nom, annee de naissance, code club.
const LABEL_RE = /^(.+?)\s*(?:\[(\d{4})\])?\s*(?:\(([^)]*)\))?$/;
const NUMBER_RE = /^\d[\d\s  ]*(?:,\d+)?$/;

export function parseFrmtTable(xml: string): { total: number; rows: FrmtRow[] } {
  const total = Number(/<LISTE\b[^>]*\bNOMBRE="(\d+)"/.exec(xml)?.[1] ?? 0);
  const rows: FrmtRow[] = [];
  for (const line of xml.matchAll(/<LIGNE\b[^>]*>([\s\S]*?)<\/LIGNE>/g)) {
    const row = parseLine(cellsOf(line[1] ?? ''));
    if (row) rows.push(row);
  }
  return { total, rows };
}

function cellsOf(line: string): string[] {
  const withoutImages = line.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  return [...withoutImages.matchAll(/<COLONNE\b[^>]*?(?:\/>|>([\s\S]*?)<\/COLONNE>)/g)].map((cell) =>
    decodeEntities((cell[1] ?? '').replace(/<[^>]+>/g, '')).trim(),
  );
}

// Les cellules sont reperees par leur contenu, pas par leur position :
// rang (entier) et evolution (+n / -n) avant le libelle, points (nombre) apres.
function parseLine(cells: string[]): FrmtRow | null {
  const labelIndex = cells.findIndex((c) => /\[\d{4}\]|\([^)]*\)$/.test(c));
  if (labelIndex < 0) return null;
  const label = LABEL_RE.exec(cells[labelIndex]!);
  const before = cells.slice(0, labelIndex);
  const rank = before.find((c) => /^\d+$/.test(c));
  const points = cells
    .slice(labelIndex + 1)
    .reverse()
    .find((c) => NUMBER_RE.test(c));
  if (!label?.[1] || !rank || !points) return null;

  const evolution = before.find((c) => /^[+-]\d+$/.test(c));
  return {
    rank: Number(rank),
    evolution: evolution ? Number(evolution) : null,
    fullName: label[1].replace(/\s+/g, ' ').trim(),
    birthYear: label[2] ? Number(label[2]) : null,
    club: label[3]?.trim() || null,
    nationality: before.find((c) => /^[A-Z]{3}$/.test(c)) ?? null,
    points: Number(points.replace(/[\s  ]/g, '').replace(',', '.')),
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
