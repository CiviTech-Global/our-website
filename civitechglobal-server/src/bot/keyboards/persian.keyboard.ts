import { InlineKeyboard, Keyboard } from 'grammy';
import type { InsuranceCategory, InsuranceSubcategory } from '@prisma/client';

const SKIP_NOTES_TEXT = '⏭ رد کردن';

export const persianKeyboards = {
  categories: (categories: InsuranceCategory[]): InlineKeyboard => {
    const keyboard = new InlineKeyboard();
    categories.forEach((category, index) => {
      const label = `${category.emoji ? `${category.emoji} ` : ''}${category.title}`;
      keyboard.text(label, `category:${category.id}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });
    return keyboard;
  },

  subcategories: (subcategories: InsuranceSubcategory[]): InlineKeyboard => {
    const keyboard = new InlineKeyboard();
    subcategories.forEach((subcategory, index) => {
      keyboard.text(subcategory.title, `subcategory:${subcategory.id}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });
    keyboard.row().text('⬅️ بازگشت به دسته‌ها', 'back:categories');
    return keyboard;
  },

  contactTime: (): InlineKeyboard =>
    new InlineKeyboard()
      .text('🌅 صبح', 'contact_time:صبح')
      .text('☀️ ظهر', 'contact_time:ظهر')
      .text('🌙 عصر', 'contact_time:عصر'),

  skipNotes: (): Keyboard => new Keyboard().text(SKIP_NOTES_TEXT).oneTime().resized(),

  isSkipNotes: (text: string): boolean => text.trim() === SKIP_NOTES_TEXT,

  confirmation: (): InlineKeyboard =>
    new InlineKeyboard().text('✅ تایید', 'confirm:yes').text('✏️ ویرایش', 'confirm:edit').text('❌ لغو', 'confirm:cancel'),

  editOptions: (): InlineKeyboard =>
    new InlineKeyboard()
      .text('دسته‌بندی', 'edit:category')
      .text('زیرشاخه', 'edit:subcategory')
      .row()
      .text('نام', 'edit:full_name')
      .text('شماره تماس', 'edit:phone')
      .row()
      .text('شهر', 'edit:city')
      .text('زمان تماس', 'edit:contact_time')
      .row()
      .text('توضیحات', 'edit:notes')
      .row()
      .text('⬅️ بازگشت به تایید', 'edit:back'),
};
