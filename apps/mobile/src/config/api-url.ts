import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3001;

// URL de l'API :
// 1. EXPO_PUBLIC_API_URL si definie (apps/mobile/.env), ex. une API deployee ;
// 2. sinon l'adresse du serveur de dev Expo (l'IP du PC sur le reseau local) avec le port de
//    l'API : un telephone sur le meme Wi-Fi joint ainsi l'API sans configuration ;
// 3. a defaut, l'hote de l'emulateur Android ou localhost.
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (devHost) return `http://${devHost}:${API_PORT}`;

  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();
