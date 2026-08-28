import pino from 'pino';
import { botConfig } from './config.js';
import { sensitivePaths } from '../config/logger.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || (botConfig.isProduction ? 'info' : 'debug'),
  redact: { paths: sensitivePaths, remove: false, censor: '[REDACTED]' },
  transport: botConfig.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
});
