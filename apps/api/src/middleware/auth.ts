import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyToken } from '../utils/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

// Etend Request avec l'utilisateur authentifie.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Header Authorization Bearer manquant');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError('Token invalide ou expire');
  }
}

// A utiliser apres requireAuth: reserve aux administrateurs.
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) throw new UnauthorizedError();
  if (req.auth.role !== 'ADMIN') {
    throw new ForbiddenError('Action reservee a l\'administrateur');
  }
  next();
}
