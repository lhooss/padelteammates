// Identifiant public d'un joueur. Deux joueurs peuvent porter le meme nom
// ("Jean-Luc"), jamais le meme identifiant : c'est lui qui permet de designer
// le bon quand on invite quelqu'un.
//
// La meme fonction sert a l'app (proposer un identifiant a l'inscription) et a
// l'API (reprise des comptes existants, variante libre en cas de collision) :
// les deux proposent donc exactement la meme chose.

export const USERNAME_MIN = 2; // aligne sur la longueur minimale du nom
export const USERNAME_MAX = 20;

const ACCENTS = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ';
const PLAIN = 'aaaaaaceeeeiiiinooooouuuuyy';

// "Jean-Luc Ménard" -> "jean-luc-menard". Chaine vide si le nom ne contient
// aucune lettre latine ni chiffre (l'appelant choisit alors un repli).
export function slugifyUsername(name: string): string {
  const plain = [...name.toLowerCase()]
    .map((char) => {
      const accent = ACCENTS.indexOf(char);
      return accent === -1 ? char : PLAIN[accent];
    })
    .join('');
  return plain
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, USERNAME_MAX)
    .replace(/^-+|-+$/g, '');
}

// Premier identifiant libre a partir d'un nom : "jean-luc", puis "jean-luc2",
// "jean-luc3"... La longueur maximale est respectee, suffixe compris.
export function suggestUsername(name: string, taken: ReadonlySet<string>): string {
  const base = slugifyUsername(name) || 'joueur';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = String(n);
    const candidate = `${base.slice(0, USERNAME_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
