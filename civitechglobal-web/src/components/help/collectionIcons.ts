import {
  BookOpen,
  Briefcase,
  Building2,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  Store,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import type { HelpCollectionId } from '@/content/help/types';

/** One icon per collection, shared by the help centre and the article pages. */
export const COLLECTION_ICONS: Record<HelpCollectionId, LucideIcon> = {
  company: Building2,
  insurance: ShieldCheck,
  consult: MessagesSquare,
  jobs: Briefcase,
  freelance: Users,
  books: BookOpen,
  marketplace: Store,
  account: KeyRound,
  member: LayoutDashboard,
  staff: UserCog,
};
