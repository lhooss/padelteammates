import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme, type ColorSchemeName } from 'react-native';

// Rendu statique (web) : le serveur ignore le theme du visiteur. On renvoie
// donc "light" jusqu'a l'hydratation, puis le theme reel.
//
// useSyncExternalStore fait exactement cette distinction serveur / client, la
// ou un setState dans un effet obtenait le meme resultat au prix d'un rendu en
// cascade a chaque montage.
//
// Le theme n'a pas de source externe a ecouter : React Native le suit deja via
// useColorScheme. L'abonnement ne fait donc rien.
const subscribe = () => () => {};

export function useColorScheme(): ColorSchemeName {
  const colorScheme = useRNColorScheme();
  return useSyncExternalStore<ColorSchemeName>(
    subscribe,
    () => colorScheme,
    () => 'light',
  );
}
