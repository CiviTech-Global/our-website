import type { BotContext } from '../types.js';

export async function helpCommand(ctx: BotContext): Promise<void> {
  await ctx.reply(
    [
      '📖 راهنمای استفاده از ربات:',
      '',
      '/start — شروع درخواست جدید بیمه',
      '/cancel — لغو فرآیند فعلی',
      '/help — نمایش این راهنما',
      '',
      'برای ثبت درخواست، روی /start کلیک کنید و مراحل را دنبال نمایید.',
    ].join('\n'),
  );
}
