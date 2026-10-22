import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { quizRouter } from './routes/quiz.routes';
import { attemptRouter } from './routes/attempt.routes';
import { gamificationRouter } from './routes/gamification.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ===============================
// DNS Configuration (optional)
// ===============================
const dnsPromises = require("node:dns/promises");
const dns = require("dns");
dnsPromises.setServers(["1.1.1.1", "8.8.8.8"]);
dns.setDefaultResultOrder("ipv4first");

// Kept separate from server.ts so tests can import the app without
// opening a port or connecting to the real database.
export function createApp() {
  const app = express();

  // Needed for correct client IPs in rate limiting when running behind proxies.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/quizzes', quizRouter);
  app.use('/api/attempts', attemptRouter);
  app.use('/api', gamificationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
