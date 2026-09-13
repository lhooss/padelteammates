import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notification recue alors que l'app est ouverte : on l'affiche quand meme, sinon
// le joueur ne voit rien tant qu'il ne consulte pas sa cloche.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushPlatform = 'android' | 'ios';

export interface PushRegistration {
  token: string;
  platform: PushPlatform;
}

// Jeton de notification de cet appareil, ou null si les push ne sont pas possibles :
// emulateur, permission refusee, ou projet Expo introuvable. Aucun de ces cas n'est
// une erreur : l'app reste utilisable, avec les notifications dans la cloche.
export async function getPushRegistration(): Promise<PushRegistration | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;

  const granted = await ensurePermission();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    // Sans canal declare, Android n'affiche aucune notification.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Matchs et invitations',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#DAF03C',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, platform: Platform.OS };
  } catch {
    // Ex. build sans configuration FCM : on n'insiste pas.
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}
