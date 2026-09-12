import type { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import type { Context, SessionFlavor } from 'grammy';
import type { PreferredContactTime } from './validators/request.validator.js';

/**
 * What the bot collects.
 *
 * Deliberately only the contact block — the same fields every product asks for
 * — and never the per-product questions. Walking someone through fourteen
 * inputs as a chat interrogation is a worse experience than a web form, and the
 * point of a Telegram enquiry is that it is quick. The specialist gets the rest
 * on the call; the website is there for anyone who would rather fill it in.
 */
export interface RequestDraft {
  categorySlug?: string;
  categoryTitle?: string;
  productSlug?: string;
  productId?: string;
  productTitle?: string;
  fullName?: string;
  phoneNumber?: string;
  city?: string;
  preferredContactTime?: PreferredContactTime;
  notes?: string;
}

export interface SessionData {
  request: RequestDraft;
}

type BaseContext = Context & SessionFlavor<SessionData>;
export type BotContext = BaseContext & ConversationFlavor<BaseContext>;
export type BotConversation = Conversation<BaseContext, BotContext>;
