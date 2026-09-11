import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes.js';
import { clubRouter } from './routes/club.routes.js';
import { matchRouter } from './routes/match.routes.js';
import { userRouter } from './routes/user.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'padelteammates', version: '0.1.0' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/clubs', clubRouter);
  app.use('/api/matches', matchRouter);
  app.use('/api/users', userRouter);
  app.use('/api/notifications', notificationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
