import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Actif en production uniquement, ou il protege un service expose.
// En test, la suite enchaine des dizaines d'inscriptions et deviendrait ininterpretable.
// En developpement, le telephone et le PC partagent la meme IP publique : la limite
// bloquerait le joueur en pleine seance d'essais, sans rien proteger.
const enabled = env.NODE_ENV === 'production';

function limiter({ windowMs, limit, message }: { windowMs: number; limit: number; message: string }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !enabled,
    // Meme forme d'erreur que le reste de l'API.
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message } });
    },
  });
}

// Connexion et inscription : freine les essais de mots de passe en masse.
export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Trop de tentatives. Reessayez dans quelques minutes.',
});

// Garde-fou general, large : un joueur normal n'en approche jamais.
export const apiLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: 'Trop de requetes. Patientez un instant.',
});
