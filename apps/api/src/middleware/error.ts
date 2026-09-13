import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route introuvable' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Contraintes Prisma -> messages metier clairs.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'Ressource en conflit (contrainte d\'unicite)' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
      return;
    }
  }

  // Corps de requete illisible (JSON malforme) : c'est une faute du client, pas du
  // serveur. body-parser porte deja un statut 4xx expose ; sans ce cas, l'erreur
  // ressortait en 500 et polluait les journaux comme "non geree".
  if (isExposedClientError(err)) {
    res.status(err.statusCode).json({
      error: { code: 'BAD_REQUEST', message: 'Corps de requete invalide (JSON attendu)' },
    });
    return;
  }

  console.error('[error] non gere:', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erreur interne du serveur' } });
}

// Erreur destinee au client, telle que celles d'express/body-parser.
function isExposedClientError(err: unknown): err is { statusCode: number } {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { expose?: unknown; statusCode?: unknown };
  return (
    candidate.expose === true &&
    typeof candidate.statusCode === 'number' &&
    candidate.statusCode >= 400 &&
    candidate.statusCode < 500
  );
}
