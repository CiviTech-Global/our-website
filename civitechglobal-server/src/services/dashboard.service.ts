import { leadRepository } from '../database/prisma/repositories/lead.repository.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';

export async function getAdminDashboard() {
  const [totalUsers, totalLeads, newLeads, contacted, inProgress, completed, cancelled, recentLeads] =
    await Promise.all([
      userRepository.count({ where: { deletedAt: null } }),
      leadRepository.count(),
      leadRepository.count({ where: { status: 'NEW' } }),
      leadRepository.count({ where: { status: 'CONTACTED' } }),
      leadRepository.count({ where: { status: 'IN_PROGRESS' } }),
      leadRepository.count({ where: { status: 'COMPLETED' } }),
      leadRepository.count({ where: { status: 'CANCELLED' } }),
      leadRepository.findManyWithRelations({ take: 5 }),
    ]);

  return {
    totalUsers,
    totalLeads,
    leadsByStatus: { NEW: newLeads, CONTACTED: contacted, IN_PROGRESS: inProgress, COMPLETED: completed, CANCELLED: cancelled },
    recentLeads,
  };
}
