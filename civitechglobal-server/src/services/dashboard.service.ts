import { prisma } from '../config/database.js';
import { insuranceRequestRepository } from '../database/prisma/repositories/insurance-request.repository.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';

/**
 * What the admin landing page counts.
 *
 * It used to count users and insurance enquiries and nothing else, which made
 * the first screen of the admin area a report on the smallest part of the
 * business. Each intake now reports a total and, more usefully, how many of
 * those are still waiting on somebody here.
 */
export async function getAdminDashboard() {
  const [
    totalUsers,
    totalLeads,
    newLeads,
    contacted,
    inProgress,
    completed,
    cancelled,
    recentLeads,
    totalProjects,
    openProjects,
    totalResumes,
    openResumes,
    totalMessages,
    unreadMessages,
  ] = await Promise.all([
    userRepository.count({ where: { deletedAt: null } }),
    insuranceRequestRepository.count(),
    insuranceRequestRepository.count({ where: { status: 'NEW' } }),
    insuranceRequestRepository.count({ where: { status: 'CONTACTED' } }),
    insuranceRequestRepository.count({ where: { status: 'IN_PROGRESS' } }),
    insuranceRequestRepository.count({ where: { status: 'COMPLETED' } }),
    insuranceRequestRepository.count({ where: { status: 'CANCELLED' } }),
    insuranceRequestRepository.findManyWithRelations({ take: 5 }),

    prisma.projectRequest.count(),
    // "Open" means the ball is with us. PROPOSAL_SENT is excluded on purpose:
    // we are waiting on the client, so it is not work sitting in a queue here.
    prisma.projectRequest.count({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEEDS_CLARIFICATION'] } },
    }),

    prisma.resumeSubmission.count(),
    prisma.resumeSubmission.count({ where: { status: { in: ['RECEIVED', 'IN_REVIEW'] } } }),

    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { readAt: null } }),
  ]);

  return {
    totalUsers,
    totalLeads,
    intake: {
      projects: { total: totalProjects, open: openProjects },
      resumes: { total: totalResumes, open: openResumes },
      insurance: { total: totalLeads, open: newLeads },
      messages: { total: totalMessages, open: unreadMessages },
    },
    leadsByStatus: {
      NEW: newLeads,
      CONTACTED: contacted,
      IN_PROGRESS: inProgress,
      COMPLETED: completed,
      CANCELLED: cancelled,
    },
    recentLeads,
  };
}
