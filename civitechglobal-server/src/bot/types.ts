import type { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import type { Context, SessionFlavor } from 'grammy';
import type { PreferredContactTime } from './validators/lead.validator.js';

export interface LeadDraft {
  categoryId?: string;
  categoryTitle?: string;
  subcategoryId?: string;
  subcategoryTitle?: string;
  fullName?: string;
  phoneNumber?: string;
  city?: string;
  preferredContactTime?: PreferredContactTime;
  notes?: string;
}

export interface SessionData {
  lead: LeadDraft;
}

type BaseContext = Context & SessionFlavor<SessionData>;
export type BotContext = BaseContext & ConversationFlavor<BaseContext>;
export type BotConversation = Conversation<BaseContext, BotContext>;
