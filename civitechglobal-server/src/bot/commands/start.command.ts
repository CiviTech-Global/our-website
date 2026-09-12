import type { BotContext } from '../types.js';
import { logger } from '../logger.js';

export async function startCommand(ctx: BotContext): Promise<void> {
  try {
    const firstName = ctx.from?.first_name;
    const welcome = firstName ? `سلام ${firstName} 👋\n\nبه سامانه خدمات بیمه خوش آمدید.` : 'سلام 👋\n\nبه سامانه خدمات بیمه خوش آمدید.';

    await ctx.reply(welcome);
    await ctx.conversation.enter('request-conversation');
  } catch (error) {
    logger.error({ error }, 'Failed to enter insurance request conversation');
    await ctx.reply('متأسفانه خطایی رخ داد. لطفا دوباره تلاش کنید.');
  }
}
