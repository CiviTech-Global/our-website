import type { Context, MiddlewareFn } from 'grammy';
import { logger } from '../logger.js';
import { Sentry } from '../../config/sentry.js';

export const errorMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // chatId/userId are Telegram PII and are redacted by the shared logger
    // config (see src/config/logger.ts sensitivePaths) — kept here for
    // debugging context, not omitted.
    logger.error({ error, chatId: ctx.chat?.id, userId: ctx.from?.id }, 'Unhandled bot error');
    // Capture the exception object only — never chat/user PII.
    Sentry.captureException(error);
    try {
      await ctx.reply('متأسفانه خطایی رخ داد. لطفا دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.');
    } catch (replyError) {
      logger.error({ replyError }, 'Failed to send error reply');
    }
  }
};
