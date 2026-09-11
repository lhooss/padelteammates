import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { BadRequestError } from '../utils/errors.js';

type Source = 'body' | 'query' | 'params';

// Fabrique un middleware qui valide+parse une partie de la requete avec un schema Zod.
// La valeur parsee (typee) remplace la source d'origine.
export function validate<T extends ZodTypeAny>(schema: T, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]) as z.infer<T>;
      // query/params sont en lecture seule dans Express 5 selon les cas: on stocke a part.
      if (source === 'body') {
        req.body = parsed;
      } else {
        (req as Request & { validated?: Record<string, unknown> }).validated = {
          ...(req as Request & { validated?: Record<string, unknown> }).validated,
          [source]: parsed,
        };
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.flatten();
        next(new BadRequestError(JSON.stringify(details.fieldErrors)));
        return;
      }
      next(err);
    }
  };
}

export function getValidated<T>(req: Request, source: Source): T {
  return (req as Request & { validated?: Record<string, unknown> }).validated?.[source] as T;
}
