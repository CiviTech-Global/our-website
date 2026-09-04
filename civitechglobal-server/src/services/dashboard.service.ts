import { insuranceRequestRepository } from '../database/prisma/repositories/insurance-request.repository.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';

export async function getAdminDashboard() {
  const [totalUsers, totalLeads, newLeads, contacted, inProgress, completed, cancelled, recentLeads] =
    await Promise.all([
      userRepository.count({ where: { deletedAt: null } }),
      insuranceRequestRepository.count(),
      insuranceRequestRepository.count({ where: { status: 'NEW' } }),
      insuranceRequestRepository.count({ where: { status: 'CONTACTED' } }),
      insuranceRequestRepository.count({ where: { status: 'IN_PROGRESS' } }),
      insuranceRequestRepository.count({ where: { status: 'COMPLETED' } }),
      insuranceRequestRepository.count({ where: { status: 'CANCELLED' } }),
      insuranceRequestRepository.findManyWithRelations({ take: 5 }),
    ]);

  return {
    totalUsers,
    totalLeads,
    leadsByStatus: { NEW: newLeads, CONTACTED: contacted, IN_PROGRESS: inProgress, COMPLETED: completed, CANCELLED: cancelled },
    recentLeads,
  };
}
