import type { BotContext } from '../types.js';

export async function cancelCommand(ctx: BotContext): Promise<void> {
  await ctx.conversation.exit('lead-conversation');
  await ctx.reply('فرآیند لغو شد. برای شروع مجدد روی /start کلیک کنید.');
}
