import type fa from '@/i18n/fa';
import type { LeadStatus } from '@/types/requests';
import type { BadgeVariant } from '@/components/ui/Badge';

export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function leadStatusBadgeVariant(status: LeadStatus): BadgeVariant {
  switch (status) {
    case 'NEW':
      return 'info';
    case 'CONTACTED':
      return 'warning';
    case 'IN_PROGRESS':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

export function leadStatusLabel(t: typeof fa, status: LeadStatus): string {
  switch (status) {
    case 'NEW':
      return t.admin.newLeads;
    case 'CONTACTED':
      return t.admin.contacted;
    case 'IN_PROGRESS':
      return t.admin.inProgress;
    case 'COMPLETED':
      return t.admin.completed;
    case 'CANCELLED':
      return t.admin.cancelled;
    default:
      return status;
  }
}
