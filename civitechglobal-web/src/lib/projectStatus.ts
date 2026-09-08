import type fa from '@/i18n/fa';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { ProjectRequestStatus } from '@/types/project';

/**
 * One place that decides how a project-request status is named and coloured,
 * so the admin table, the detail page and the public tracking page cannot
 * disagree about what "PROPOSAL_SENT" looks like.
 */

export const PROJECT_STATUSES: ProjectRequestStatus[] = [
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_CLARIFICATION',
  'PROPOSAL_SENT',
  'ACCEPTED',
  'DECLINED',
  'WITHDRAWN',
  'EXPIRED',
];

export function projectStatusBadgeVariant(status: ProjectRequestStatus): BadgeVariant {
  switch (status) {
    case 'ACCEPTED':
      return 'success';
    case 'PROPOSAL_SENT':
      return 'info';
    // Both of these mean the queue is waiting on somebody, which is the thing
    // worth noticing at a glance.
    case 'NEEDS_CLARIFICATION':
    case 'IN_REVIEW':
      return 'warning';
    case 'DECLINED':
    case 'EXPIRED':
      return 'danger';
    default:
      return 'default';
  }
}

export function projectStatusLabel(t: typeof fa, status: ProjectRequestStatus): string {
  return t.proposal.statuses[status] ?? status;
}
