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

// Pourquoi les notifications ne fonctionnent pas, le cas echeant. Un echec est
// silencieux pour le joueur (l'app reste utilisable, tout est dans la cloche),
// mais il doit rester lisible : sans cela, un "rien ne marche" est indiagnosticable.
export type PushDiagnostic =
  | { status: 'ok'; registration: PushRegistration }
  | { status: 'emulator' }
  | { status: 'denied' }
  | { status: 'no-project-id' }
  | { status: 'error'; message: string };

export async function diagnosePush(): Promise<PushDiagnostic> {
  if (!Device.isDevice) return { status: 'emulator' };
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return { status: 'emulator' };

  if (!(await ensurePermission())) return { status: 'denied' };

  if (Platform.OS === 'android') {
    // Sans canal declare, Android n'affiche aucune notification.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Matchs et invitations',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#DAF03C',
    });
  }

  const projectId = resolveProjectId();
  if (!projectId) return { status: 'no-project-id' };

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'ok', registration: { token: data, platform: Platform.OS } };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

// Jeton de cet appareil, ou null si les notifications ne sont pas possibles.
export async function getPushRegistration(): Promise<PushRegistration | null> {
  const diagnostic = await diagnosePush();
  return diagnostic.status === 'ok' ? diagnostic.registration : null;
}

// L'identifiant du projet Expo peut venir de deux endroits selon que l'app tourne
// depuis son binaire ou depuis une mise a jour : on essaie les deux.
function resolveProjectId(): string | undefined {
  const fromEas = Constants.easConfig?.projectId;
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  return fromEas ?? fromExtra;
}

// Message court, affichable tel quel dans l'ecran Profil.
export function describePushDiagnostic(diagnostic: PushDiagnostic): string {
  switch (diagnostic.status) {
    case 'ok':
      return 'Cet appareil est enregistré.';
    case 'emulator':
      return 'Les notifications ne fonctionnent pas sur émulateur.';
    case 'denied':
      return 'Notifications refusées. Autorisez-les dans les réglages du téléphone.';
    case 'no-project-id':
      return 'Identifiant de projet Expo introuvable dans cette version de l\'app.';
    case 'error':
      return `Échec : ${diagnostic.message}`;
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}
