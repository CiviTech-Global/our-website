import fastify, { type FastifyInstance } from 'fastify';
import { Bot, GrammyError, HttpError } from 'grammy';
import type { Update } from '@grammyjs/types';
import { conversations, createConversation } from '@grammyjs/conversations';
import { session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { botConfig } from './config.js';
import { logger } from './logger.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { webhookRateLimit } from './middleware/webhookRateLimit.js';
import { startCommand } from './commands/start.command.js';
import { helpCommand } from './commands/help.command.js';
import { cancelCommand } from './commands/cancel.command.js';
import { leadConversation } from './conversations/lead.conversation.js';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { Sentry } from '../config/sentry.js';
import type { BotContext, SessionData } from './types.js';

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(botConfig.token);

  bot.use(errorMiddleware);
  bot.use(
    session({
      initial: (): SessionData => ({ lead: {} }),
      // Redis-backed session storage so in-flight conversation state
      // (e.g. a lead being drafted) survives bot process restarts/deploys
      // instead of living only in process memory.
      storage: new RedisAdapter<SessionData>({ instance: redis }),
    }),
  );
  bot.use(conversations());
  bot.use(createConversation(leadConversation, 'lead-conversation'));

  bot.command('start', startCommand);
  bot.command('help', helpCommand);
  bot.command('cancel', cancelCommand);

  bot.on('message:text', async (ctx) => {
    if (ctx.msg.text.startsWith('/')) return;
    await ctx.reply('برای شروع درخواست بیمه روی /start کلیک کنید.');
  });

  bot.catch((error) => {
    if (error instanceof GrammyError) {
      logger.error({ error: error.description }, 'Grammy error');
    } else if (error instanceof HttpError) {
      logger.error({ error: error.error }, 'Telegram HTTP error');
    } else {
      logger.error({ message: (error as Error).message }, 'Bot error');
    }
    // Capture the exception object only — never chat/user PII.
    Sentry.captureException(error);
  });

  return bot;
}

export async function createApp(): Promise<FastifyInstance> {
  if (botConfig.isProduction && botConfig.mode === 'webhook' && !botConfig.webhookSecret) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET is required when running in webhook mode in production');
  }

  const app = fastify({ logger, bodyLimit: 1024 * 1024 });
  const bot = createBot();

  app.get('/health/live', async () => ({ status: 'ok', service: 'telegram-bot' }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', service: 'telegram-bot', checks: { database: true } });
    } catch (error) {
      logger.error({ message: (error as Error).message }, 'Bot readiness check failed: database');
      return reply.status(503).send({ status: 'error', service: 'telegram-bot', checks: { database: false } });
    }
  });

  if (botConfig.mode === 'webhook' && botConfig.webhookUrl) {
    app.post('/webhook', { preHandler: webhookRateLimit }, async (request, reply) => {
      if (botConfig.webhookSecret) {
        const secretHeader = request.headers[TELEGRAM_SECRET_HEADER];
        if (secretHeader !== botConfig.webhookSecret) {
          logger.warn({ ip: request.ip }, 'Webhook request with invalid secret token');
          return reply.status(401).send({ ok: false, error: 'Unauthorized' });
        }
      }

      await bot.handleUpdate(request.body as Update);
      return reply.status(200).send({ ok: true });
    });

    const webhookOptions = botConfig.webhookSecret ? { secret_token: botConfig.webhookSecret } : undefined;
    await bot.api.setWebhook(botConfig.webhookUrl, webhookOptions);
    logger.info({ webhookUrl: botConfig.webhookUrl }, 'Webhook set');
  }

  app.addHook('onReady', async () => {
    if (botConfig.mode !== 'webhook') {
      bot.start().catch((error) => {
        logger.error({ message: (error as Error).message }, 'Bot polling error');
      });
      logger.info('Bot started in polling mode');
    }
  });

  app.addHook('onClose', async () => {
    if (botConfig.mode !== 'webhook') {
      await bot.stop();
    }
    logger.info('Bot stopped');
  });

  return app;
}
