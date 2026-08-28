import { InlineKeyboard } from 'grammy';
import type { BotContext, BotConversation, LeadDraft } from '../types.js';
import { insuranceService } from '../services/insurance.service.js';
import { leadService } from '../services/lead.service.js';
import { notificationService } from '../services/notification.service.js';
import { persianKeyboards } from '../keyboards/persian.keyboard.js';
import {
  parseCity,
  parseFullName,
  parseNotes,
  parsePhoneNumber,
  parsePreferredContactTime,
} from '../validators/lead.validator.js';
import { logger } from '../logger.js';

function formatConfirmation(lead: LeadDraft): string {
  return [
    'لطفا اطلاعات زیر را بررسی کنید:',
    '',
    `نوع بیمه:\n${lead.categoryTitle}`,
    '',
    `زیرشاخه:\n${lead.subcategoryTitle}`,
    '',
    `نام:\n${lead.fullName}`,
    '',
    `شماره تماس:\n${lead.phoneNumber}`,
    '',
    `شهر:\n${lead.city}`,
    '',
    `زمان تماس:\n${lead.preferredContactTime}`,
    '',
    `توضیحات:\n${lead.notes || 'ندارد'}`,
  ].join('\n');
}

async function selectCategory(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  const categories = await conversation.external(() => insuranceService.getAllCategories());

  await ctx.reply('لطفا نوع بیمه مورد نظر خود را انتخاب کنید:', { reply_markup: persianKeyboards.categories(categories) });

  const response = await conversation.waitForCallbackQuery(/^category:(.+)$/);
  await response.answerCallbackQuery();
  const categoryId = response.match[1];

  const category = await conversation.external(() => insuranceService.getCategoryById(categoryId));
  if (!category) {
    await ctx.reply('دسته‌بندی انتخاب شده نامعتبر است. لطفا دوباره تلاش کنید.');
    return selectCategory(conversation, ctx, lead);
  }

  lead.categoryId = category.id;
  lead.categoryTitle = category.title;
}

async function selectSubcategory(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  const categoryId = lead.categoryId;
  if (!categoryId) {
    await ctx.reply('خطایی رخ داد. لطفا دوباره از /start شروع کنید.');
    throw new Error('Missing categoryId in lead draft');
  }

  const subcategories = await conversation.external(() => insuranceService.getSubcategoriesByCategoryId(categoryId));

  if (subcategories.length === 0) {
    await ctx.reply('برای این دسته‌بندی زیرشاخه‌ای یافت نشد. لطفا دسته دیگری انتخاب کنید.');
    await selectCategory(conversation, ctx, lead);
    return selectSubcategory(conversation, ctx, lead);
  }

  await ctx.reply('لطفا زیرشاخه بیمه مورد نظر خود را انتخاب کنید:', { reply_markup: persianKeyboards.subcategories(subcategories) });

  const response = await conversation.waitForCallbackQuery(/^(subcategory|back):(.+)$/);
  await response.answerCallbackQuery();
  const [, action, value] = response.match;

  if (action === 'back') {
    await selectCategory(conversation, ctx, lead);
    return selectSubcategory(conversation, ctx, lead);
  }

  const subcategory = await conversation.external(() => insuranceService.getSubcategoryById(value as string));
  if (!subcategory || subcategory.categoryId !== lead.categoryId) {
    await ctx.reply('زیرشاخه انتخاب شده نامعتبر است. لطفا دوباره تلاش کنید.');
    return selectSubcategory(conversation, ctx, lead);
  }

  lead.subcategoryId = subcategory.id;
  lead.subcategoryTitle = subcategory.title;
}

async function askFullName(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  await ctx.reply('نام و نام خانوادگی خود را وارد کنید:');
  const response = await conversation.waitFor('message:text');

  try {
    lead.fullName = parseFullName(response.msg.text);
  } catch {
    await ctx.reply('نام و نام خانوادگی باید بین ۳ تا ۱۰۰ کاراکتر باشد. لطفا دوباره وارد کنید:');
    return askFullName(conversation, ctx, lead);
  }
}

async function askPhoneNumber(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  await ctx.reply('شماره تماس خود را وارد کنید:');
  const response = await conversation.waitFor('message:text');

  try {
    lead.phoneNumber = parsePhoneNumber(response.msg.text);
  } catch {
    await ctx.reply('شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد. لطفا دوباره وارد کنید:');
    return askPhoneNumber(conversation, ctx, lead);
  }
}

async function askCity(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  await ctx.reply('شهر محل سکونت خود را وارد کنید:');
  const response = await conversation.waitFor('message:text');

  try {
    lead.city = parseCity(response.msg.text);
  } catch {
    await ctx.reply('نام شهر باید بین ۲ تا ۱۰۰ کاراکتر باشد. لطفا دوباره وارد کنید:');
    return askCity(conversation, ctx, lead);
  }
}

async function askPreferredContactTime(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  await ctx.reply('چه زمانی برای تماس مناسب‌تر است؟', { reply_markup: persianKeyboards.contactTime() });

  const response = await conversation.waitForCallbackQuery(/^contact_time:(.+)$/);
  await response.answerCallbackQuery();

  try {
    lead.preferredContactTime = parsePreferredContactTime(response.match[1]);
  } catch {
    await ctx.reply('زمان تماس نامعتبر است. لطفا دوباره انتخاب کنید:');
    return askPreferredContactTime(conversation, ctx, lead);
  }
}

async function askNotes(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<void> {
  await ctx.reply('توضیحات تکمیلی (اختیاری):', { reply_markup: persianKeyboards.skipNotes() });
  const response = await conversation.waitFor('message:text');

  if (persianKeyboards.isSkipNotes(response.msg.text)) {
    lead.notes = undefined;
    return;
  }

  try {
    lead.notes = parseNotes(response.msg.text);
  } catch {
    await ctx.reply('توضیحات نباید بیشتر از ۵۰۰ کاراکتر باشد. لطفا دوباره وارد کنید یا رد کنید:');
    return askNotes(conversation, ctx, lead);
  }
}

async function confirmAndSubmit(conversation: BotConversation, ctx: BotContext, lead: LeadDraft): Promise<boolean> {
  await ctx.reply(formatConfirmation(lead), { reply_markup: persianKeyboards.confirmation() });

  const response = await conversation.waitForCallbackQuery(/^confirm:(.+)$/);
  await response.answerCallbackQuery();
  const action = response.match[1];

  if (action === 'yes') return true;

  if (action === 'cancel') {
    await ctx.reply('فرآیند لغو شد. برای شروع مجدد روی /start کلیک کنید.');
    return false;
  }

  if (action === 'edit') {
    await ctx.reply('لطفا بخش مورد نظر برای ویرایش را انتخاب کنید:', { reply_markup: persianKeyboards.editOptions() });

    const editResponse = await conversation.waitForCallbackQuery(/^edit:(.+)$/);
    await editResponse.answerCallbackQuery();

    switch (editResponse.match[1]) {
      case 'category':
        await selectCategory(conversation, ctx, lead);
        await selectSubcategory(conversation, ctx, lead);
        break;
      case 'subcategory':
        await selectSubcategory(conversation, ctx, lead);
        break;
      case 'full_name':
        await askFullName(conversation, ctx, lead);
        break;
      case 'phone':
        await askPhoneNumber(conversation, ctx, lead);
        break;
      case 'city':
        await askCity(conversation, ctx, lead);
        break;
      case 'contact_time':
        await askPreferredContactTime(conversation, ctx, lead);
        break;
      case 'notes':
        await askNotes(conversation, ctx, lead);
        break;
      default:
        break;
    }

    return confirmAndSubmit(conversation, ctx, lead);
  }

  return false;
}

export async function leadConversation(conversation: BotConversation, ctx: BotContext): Promise<void> {
  const lead: LeadDraft = {};

  try {
    await selectCategory(conversation, ctx, lead);
    await selectSubcategory(conversation, ctx, lead);
    await askFullName(conversation, ctx, lead);
    await askPhoneNumber(conversation, ctx, lead);
    await askCity(conversation, ctx, lead);
    await askPreferredContactTime(conversation, ctx, lead);
    await askNotes(conversation, ctx, lead);

    const confirmed = await confirmAndSubmit(conversation, ctx, lead);
    if (!confirmed) return;

    const createdLead = await conversation.external(() =>
      leadService.createLead({
        telegramUserId: String(ctx.from?.id ?? ''),
        telegramUsername: ctx.from?.username ?? null,
        telegramFirstName: ctx.from?.first_name ?? null,
        categoryId: lead.categoryId!,
        subcategoryId: lead.subcategoryId!,
        fullName: lead.fullName!,
        phoneNumber: lead.phoneNumber!,
        city: lead.city!,
        preferredContactTime: lead.preferredContactTime!,
        notes: lead.notes ?? null,
      }),
    );

    await conversation.external(() => notificationService.notifyAdmins(ctx.api, createdLead));

    await ctx.reply(
      ['✅ درخواست شما با موفقیت ثبت شد.', '', 'کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.', '', 'برای ثبت درخواست جدید روی /start کلیک کنید.'].join(
        '\n',
      ),
      { reply_markup: new InlineKeyboard() },
    );
  } catch (error) {
    logger.error({ error }, 'Error in lead conversation');
    await ctx.reply('متأسفانه خطایی رخ داد. لطفا دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.');
  }
}
