import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3001;

// API de production. Elle sert de repli hors developpement : une app installee
// (APK ou mise a jour a distance) n'a pas de serveur Expo, et retomber sur une
// adresse d'emulateur la rendrait inutilisable.
const PRODUCTION_API_URL = 'https://api.padelteammates.com';

// URL de l'API :
// 1. EXPO_PUBLIC_API_URL si definie (apps/mobile/.env, ou variable d'environnement EAS) ;
// 2. sinon l'adresse du serveur de dev Expo (l'IP du PC sur le reseau local) avec le port de
//    l'API : un telephone sur le meme Wi-Fi joint ainsi l'API sans configuration ;
// 3. hors developpement, l'API de production ;
// 4. a defaut, l'hote de l'emulateur Android ou localhost.
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (devHost) return `http://${devHost}:${API_PORT}`;

  if (!__DEV__) return PRODUCTION_API_URL;

  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();
