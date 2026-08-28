import pino from 'pino';
import { env } from './env.js';

export const sensitivePaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  '*.password',
  '*.refreshToken',
  '*.accessToken',
  // Telegram chat/user IDs are PII for this project and must never be
  // logged in plaintext (see src/bot/middleware/error.middleware.ts,
  // src/bot/services/notification.service.ts).
  'chatId',
  'userId',
  'telegramUserId',
  'telegramId',
  'adminId',
  '*.chatId',
  '*.userId',
  '*.telegramUserId',
  '*.telegramId',
  '*.adminId',
  // Lead PII: names, phone numbers, city, and free-text notes collected
  // from the Persian insurance lead flow must never be logged in plaintext,
  // matching the same rationale as the Telegram identifiers above.
  'fullName',
  'phoneNumber',
  'phoneNumberHash',
  'city',
  'notes',
  'telegramUsername',
  'telegramFirstName',
  'telegramLastName',
  'email',
  'emailHash',
  '*.fullName',
  '*.phoneNumber',
  '*.phoneNumberHash',
  '*.city',
  '*.notes',
  '*.telegramUsername',
  '*.telegramFirstName',
  '*.telegramLastName',
  '*.email',
  '*.emailHash',
  'req.body.fullName',
  'req.body.phoneNumber',
  'req.body.email',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: sensitivePaths,
    remove: false,
    censor: '[REDACTED]',
  },
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});
