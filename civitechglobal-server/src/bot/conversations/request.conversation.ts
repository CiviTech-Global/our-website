import { InlineKeyboard } from 'grammy';
import type { BotContext, BotConversation, RequestDraft } from '../types.js';
import { insuranceService } from '../services/insurance.service.js';
import { requestService } from '../services/request.service.js';
import { notificationService } from '../services/notification.service.js';
import { persianKeyboards } from '../keyboards/persian.keyboard.js';
import {
  parseCity,
  parseFullName,
  parseNotes,
  parsePhoneNumber,
  parsePreferredContactTime,
} from '../validators/request.validator.js';
import { logger } from '../logger.js';

const CONTACT_TIME_LABELS: Record<string, string> = {
  morning: 'صبح',
  noon: 'ظهر',
  evening: 'عصر',
  any: 'فرقی ندارد',
};

function formatConfirmation(draft: RequestDraft): string {
  return [
    'لطفا اطلاعات زیر را بررسی کنید:',
    '',
    `نوع بیمه:\n${draft.productTitle}`,
    '',
    `نام:\n${draft.fullName}`,
    '',
    `شماره تماس:\n${draft.phoneNumber}`,
    '',
    `شهر:\n${draft.city}`,
    '',
    `زمان تماس:\n${CONTACT_TIME_LABELS[draft.preferredContactTime ?? 'any']}`,
    '',
    `توضیحات:\n${draft.notes || 'ندارد'}`,
  ].join('\n');
}

async function selectCategory(
  conversation: BotConversation,
  ctx: BotContext,
  draft: RequestDraft,
): Promise<void> {
  const catalog = await conversation.external(() => insuranceService.getCatalog());
  const withProducts = catalog.filter((category) => category.products.length > 0);

  if (withProducts.length === 0) {
    // Only reachable if the seed has not been run against this database.
    await ctx.reply('در حال حاضر فهرست بیمه‌ها در دسترس نیست. لطفا بعدا تلاش کنید.');
    throw new Error('Insurance catalog is empty');
  }

  await ctx.reply('لطفا دسته‌بندی بیمه مورد نظر خود را انتخاب کنید:', {
    reply_markup: persianKeyboards.categories(withProducts),
  });

  const response = await conversation.waitForCallbackQuery(/^category:(.+)$/);
  await response.answerCallbackQuery();
  const categorySlug = response.match[1] as string;

  const category = withProducts.find((c) => c.slug === categorySlug);
  if (!category) {
    await ctx.reply('دسته‌بندی انتخاب شده نامعتبر است. لطفا دوباره تلاش کنید.');
    return selectCategory(conversation, ctx, draft);
  }

  draft.categorySlug = category.slug;
  draft.categoryTitle = category.title;
}

async function selectProduct(
  conversation: BotConversation,
  ctx: BotContext,
  draft: RequestDraft,
): Promise<void> {
  const categorySlug = draft.categorySlug;
  if (!categorySlug) {
    await ctx.reply('خطایی رخ داد. لطفا دوباره از /start شروع کنید.');
    throw new Error('Missing categorySlug in request draft');
  }

  const catalog = await conversation.external(() => insuranceService.getCatalog());
  const category = catalog.find((c) => c.slug === categorySlug);
  const products = category?.products ?? [];

  if (products.length === 0) {
    await ctx.reply('برای این دسته‌بندی محصولی یافت نشد. لطفا دسته دیگری انتخاب کنید.');
    await selectCategory(conversation, ctx, draft);
    return selectProduct(conversation, ctx, draft);
  }

  await ctx.reply('لطفا نوع بیمه مورد نظر خود را انتخاب کنید:', {
    reply_markup: persianKeyboards.products(products),
  });

  const response = await conversation.waitForCallbackQuery(/^(product|back):(.+)$/);
  await response.answerCallbackQuery();
  const [, action, value] = response.match;

  if (action === 'back') {
    await selectCategory(conversation, ctx, draft);
    return selectProduct(conversation, ctx, draft);
  }

  // Re-read the product rather than trusting the keyboard's slug: the id has to
  // come from the database anyway, and this rejects a stale button pressed
  // after a product was withdrawn.
  const product = await conversation.external(() => insuranceService.getProductBySlug(value as string));
  if (!product || product.category.slug !== categorySlug) {
    await ctx.reply('نوع بیمه انتخاب شده نامعتبر است. لطفا دوباره تلاش کنید.');
    return selectProduct(conversation, ctx, draft);
  }

  draft.productId = product.id;
  draft.productSlug = product.slug;
  draft.productTitle = product.title;
}

async function askFullName(conversation: BotConversation, ctx: BotContext, draft: RequestDraft): Promise<void> {
  await ctx.reply('نام و نام خانوادگی خود را وارد کنید:');
  const response = await conversation.waitFor('message:text');

  try {
    draft.fullName = parseFullName(response.msg.text);
  } catch {
    await ctx.reply('نام و نام خانوادگی باید بین ۳ تا ۱۰۰ کاراکتر باشد. لطفا دوباره وارد کنید:');
    return askFullName(conversation, ctx, draft);
  }
}

async function askPhoneNumber(conversation: BotConversation, ctx: BotContext, draft: RequestDraft): Promise<void> {
  await ctx.reply('شماره تماس خود را وارد کنید:');
  const response = await conversation.waitFor('message:text');

  try {
    draft.phoneNumber = parsePhoneNumber(response.msg.text);
  } catch {
    await ctx.reply('شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد. لطفا دوباره وارد کنید:');
    return askPhoneNumber(conversation, ctx, draft);
  }
}

async function askCity(conversation: BotConversation, ctx: BotContext, draft: RequestDraft): Promise<void> {
  await ctx.reply('شهر محل سکونت خود را وارد کنید:');
  const response = await conversation.waitFor('message:text');

  try {
    draft.city = parseCity(response.msg.text);
  } catch {
    await ctx.reply('نام شهر باید بین ۲ تا ۱۰۰ کاراکتر باشد. لطفا دوباره وارد کنید:');
    return askCity(conversation, ctx, draft);
  }
}

async function askPreferredContactTime(
  conversation: BotConversation,
  ctx: BotContext,
  draft: RequestDraft,
): Promise<void> {
  await ctx.reply('چه زمانی برای تماس مناسب‌تر است؟', { reply_markup: persianKeyboards.contactTime() });

  const response = await conversation.waitForCallbackQuery(/^contact_time:(.+)$/);
  await response.answerCallbackQuery();

  try {
    draft.preferredContactTime = parsePreferredContactTime(response.match[1] as string);
  } catch {
    await ctx.reply('زمان تماس نامعتبر است. لطفا دوباره انتخاب کنید:');
    return askPreferredContactTime(conversation, ctx, draft);
  }
}

async function askNotes(conversation: BotConversation, ctx: BotContext, draft: RequestDraft): Promise<void> {
  await ctx.reply('توضیحات تکمیلی (اختیاری):', { reply_markup: persianKeyboards.skipNotes() });
  const response = await conversation.waitFor('message:text');

  if (persianKeyboards.isSkipNotes(response.msg.text)) {
    draft.notes = undefined;
    return;
  }

  try {
    draft.notes = parseNotes(response.msg.text);
  } catch {
    await ctx.reply('توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد. لطفا دوباره وارد کنید یا رد کنید:');
    return askNotes(conversation, ctx, draft);
  }
}

async function confirmAndSubmit(
  conversation: BotConversation,
  ctx: BotContext,
  draft: RequestDraft,
): Promise<boolean> {
  await ctx.reply(formatConfirmation(draft), { reply_markup: persianKeyboards.confirmation() });

  const response = await conversation.waitForCallbackQuery(/^confirm:(.+)$/);
  await response.answerCallbackQuery();
  const action = response.match[1];

  if (action === 'yes') return true;

  if (action === 'cancel') {
    await ctx.reply('فرآیند لغو شد. برای شروع مجدد روی /start کلیک کنید.');
    return false;
  }

  if (action === 'edit') {
    await ctx.reply('لطفا بخش مورد نظر برای ویرایش را انتخاب کنید:', {
      reply_markup: persianKeyboards.editOptions(),
    });

    const editResponse = await conversation.waitForCallbackQuery(/^edit:(.+)$/);
    await editResponse.answerCallbackQuery();

    switch (editResponse.match[1]) {
      case 'product':
        await selectCategory(conversation, ctx, draft);
        await selectProduct(conversation, ctx, draft);
        break;
      case 'full_name':
        await askFullName(conversation, ctx, draft);
        break;
      case 'phone':
        await askPhoneNumber(conversation, ctx, draft);
        break;
      case 'city':
        await askCity(conversation, ctx, draft);
        break;
      case 'contact_time':
        await askPreferredContactTime(conversation, ctx, draft);
        break;
      case 'notes':
        await askNotes(conversation, ctx, draft);
        break;
      default:
        break;
    }

    return confirmAndSubmit(conversation, ctx, draft);
  }

  return false;
}

export async function requestConversation(conversation: BotConversation, ctx: BotContext): Promise<void> {
  const draft: RequestDraft = {};

  try {
    await selectCategory(conversation, ctx, draft);
    await selectProduct(conversation, ctx, draft);
    await askFullName(conversation, ctx, draft);
    await askPhoneNumber(conversation, ctx, draft);
    await askCity(conversation, ctx, draft);
    await askPreferredContactTime(conversation, ctx, draft);
    await askNotes(conversation, ctx, draft);

    const confirmed = await confirmAndSubmit(conversation, ctx, draft);
    if (!confirmed) return;

    const created = await conversation.external(() =>
      requestService.createRequest({
        telegramUserId: String(ctx.from?.id ?? ''),
        telegramUsername: ctx.from?.username ?? null,
        telegramFirstName: ctx.from?.first_name ?? null,
        productId: draft.productId!,
        fullName: draft.fullName!,
        phoneNumber: draft.phoneNumber!,
        city: draft.city!,
        preferredContactTime: draft.preferredContactTime!,
        notes: draft.notes ?? null,
      }),
    );

    await conversation.external(() => notificationService.notifyAdmins(ctx.api, created));

    await ctx.reply(
      [
        '✅ درخواست شما با موفقیت ثبت شد.',
        '',
        `کد پیگیری شما: ${created.trackingCode}`,
        'این کد را نگه دارید — با آن می‌توانید وضعیت درخواست را در وب‌سایت پیگیری کنید.',
        '',
        'کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.',
        '',
        'برای ثبت درخواست جدید روی /start کلیک کنید.',
      ].join('\n'),
      { reply_markup: new InlineKeyboard() },
    );
  } catch (error) {
    logger.error({ error }, 'Error in insurance request conversation');
    await ctx.reply('متأسفانه خطایی رخ داد. لطفا دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.');
  }
}
