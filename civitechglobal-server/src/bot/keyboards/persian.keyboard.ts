import { InlineKeyboard, Keyboard } from 'grammy';

const SKIP_NOTES_TEXT = '⏭ رد کردن';

export interface CategoryButton {
  slug: string;
  title: string;
  emoji: string | null;
}

export interface ProductButton {
  slug: string;
  title: string;
}

/**
 * Callback data is capped by Telegram at 64 bytes, and a Persian title is
 * three bytes per character — so buttons carry the slug, which is ASCII and
 * short, never the title or a cuid pair.
 */
export const persianKeyboards = {
  categories: (categories: CategoryButton[]): InlineKeyboard => {
    const keyboard = new InlineKeyboard();
    categories.forEach((category, index) => {
      const label = `${category.emoji ? `${category.emoji} ` : ''}${category.title}`;
      keyboard.text(label, `category:${category.slug}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });
    return keyboard;
  },

  /**
   * One product per row. Product titles run long («مسئولیت کارفرما در قبال
   * کارکنان ساختمانی»); two to a row truncates them into ambiguity.
   */
  products: (products: ProductButton[]): InlineKeyboard => {
    const keyboard = new InlineKeyboard();
    products.forEach((product) => {
      keyboard.text(product.title, `product:${product.slug}`).row();
    });
    keyboard.text('⬅️ بازگشت به دسته‌ها', 'back:categories');
    return keyboard;
  },

  contactTime: (): InlineKeyboard =>
    new InlineKeyboard()
      .text('🌅 صبح', 'contact_time:morning')
      .text('☀️ ظهر', 'contact_time:noon')
      .row()
      .text('🌙 عصر', 'contact_time:evening')
      .text('🕐 فرقی ندارد', 'contact_time:any'),

  skipNotes: (): Keyboard => new Keyboard().text(SKIP_NOTES_TEXT).oneTime().resized(),

  isSkipNotes: (text: string): boolean => text.trim() === SKIP_NOTES_TEXT,

  confirmation: (): InlineKeyboard =>
    new InlineKeyboard()
      .text('✅ تایید', 'confirm:yes')
      .text('✏️ ویرایش', 'confirm:edit')
      .text('❌ لغو', 'confirm:cancel'),

  editOptions: (): InlineKeyboard =>
    new InlineKeyboard()
      .text('نوع بیمه', 'edit:product')
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
