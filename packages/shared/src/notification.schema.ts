import { z } from 'zod';

// Jeton de notification push d'un appareil, tel que fourni par Expo
// ("ExponentPushToken[...]"). Un joueur peut en avoir plusieurs (telephone, tablette).
export const pushTokenSchema = z.object({
  token: z.string().min(10, 'Jeton de notification invalide').max(255),
  platform: z.enum(['android', 'ios']),
});

export type PushTokenInput = z.infer<typeof pushTokenSchema>;
