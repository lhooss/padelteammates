import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Enrobe un handler async pour propager les rejets vers le middleware d'erreur.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
