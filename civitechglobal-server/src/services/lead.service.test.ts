import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  leadRepository: {
    findManyWithRelations: vi.fn(),
    findFirstWithRelations: vi.fn(),
    count: vi.fn(async () => 0),
    updateStatus: vi.fn(),
    assign: vi.fn(),
  },
  userRepository: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../database/prisma/repositories/lead.repository.js', () => ({
  leadRepository: mocks.leadRepository,
}));
vi.mock('../database/prisma/repositories/user.repository.js', () => ({
  userRepository: mocks.userRepository,
}));

import * as leadService from './lead.service.js';

const ADMIN = { userId: 'admin-1', role: 'ADMIN' } as const;
const SUPER_ADMIN = { userId: 'super-1', role: 'SUPER_ADMIN' } as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.leadRepository.count.mockResolvedValue(0);
});

describe('lead.service row-level scoping', () => {
  it('getAllLeads scopes non-SUPER_ADMIN principals to their own or unassigned leads', async () => {
    mocks.leadRepository.findManyWithRelations.mockResolvedValue([]);

    await leadService.getAllLeads({ page: 1, limit: 20 } as any, ADMIN);

    const callArgs = mocks.leadRepository.findManyWithRelations.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      OR: [{ assignedToId: ADMIN.userId }, { assignedToId: null }],
    });
  });

  it('getAllLeads does not scope SUPER_ADMIN principals', async () => {
    mocks.leadRepository.findManyWithRelations.mockResolvedValue([]);

    await leadService.getAllLeads({ page: 1, limit: 20 } as any, SUPER_ADMIN);

    const callArgs = mocks.leadRepository.findManyWithRelations.mock.calls[0][0];
    expect(callArgs.where).toEqual({});
  });

  // Regression test for the row-level-scoping bypass found in the platform
  // infrastructure audit: getLeadStats() previously ran unscoped counts,
  // leaking platform-wide lead volume to any non-SUPER_ADMIN principal with
  // the `leads` permission.
  it('getLeadStats scopes every count to the requesting principal', async () => {
    await leadService.getLeadStats(ADMIN);

    expect(mocks.leadRepository.count).toHaveBeenCalledTimes(6);
    for (const call of mocks.leadRepository.count.mock.calls) {
      const where = call[0].where;
      expect(where.OR).toEqual([{ assignedToId: ADMIN.userId }, { assignedToId: null }]);
    }
  });

  it('getLeadStats does not scope SUPER_ADMIN principals', async () => {
    await leadService.getLeadStats(SUPER_ADMIN);

    for (const call of mocks.leadRepository.count.mock.calls) {
      expect(call[0].where.OR).toBeUndefined();
    }
  });

  it('assignLead rejects assignment to a nonexistent user', async () => {
    mocks.leadRepository.findFirstWithRelations.mockResolvedValue({ id: 'lead-1' });
    mocks.userRepository.findUnique.mockResolvedValue(null);

    await expect(leadService.assignLead('lead-1', 'ghost-user', SUPER_ADMIN)).rejects.toThrow('Assignee not found');
    expect(mocks.leadRepository.assign).not.toHaveBeenCalled();
  });

  it('assignLead rejects assignment to a deactivated user', async () => {
    mocks.leadRepository.findFirstWithRelations.mockResolvedValue({ id: 'lead-1' });
    mocks.userRepository.findUnique.mockResolvedValue({ id: 'user-2', deletedAt: new Date() });

    await expect(leadService.assignLead('lead-1', 'user-2', SUPER_ADMIN)).rejects.toThrow('Assignee not found');
    expect(mocks.leadRepository.assign).not.toHaveBeenCalled();
  });

  it('assignLead succeeds for an active user', async () => {
    mocks.leadRepository.findFirstWithRelations.mockResolvedValue({ id: 'lead-1' });
    mocks.userRepository.findUnique.mockResolvedValue({ id: 'user-2', deletedAt: null });
    mocks.leadRepository.assign.mockResolvedValue({ id: 'lead-1', assignedToId: 'user-2' });

    await leadService.assignLead('lead-1', 'user-2', SUPER_ADMIN);
    expect(mocks.leadRepository.assign).toHaveBeenCalledWith('lead-1', 'user-2');
  });

  it('assignLead allows clearing the assignment without a user lookup', async () => {
    mocks.leadRepository.findFirstWithRelations.mockResolvedValue({ id: 'lead-1' });
    mocks.leadRepository.assign.mockResolvedValue({ id: 'lead-1', assignedToId: null });

    await leadService.assignLead('lead-1', null, SUPER_ADMIN);
    expect(mocks.userRepository.findUnique).not.toHaveBeenCalled();
    expect(mocks.leadRepository.assign).toHaveBeenCalledWith('lead-1', null);
  });

  it('getLeadById scopes the lookup and 404s outside the scope', async () => {
    mocks.leadRepository.findFirstWithRelations.mockResolvedValue(null);

    await expect(leadService.getLeadById('lead-1', ADMIN)).rejects.toThrow('Lead not found');

    const where = mocks.leadRepository.findFirstWithRelations.mock.calls[0][0];
    expect(where).toEqual({
      id: 'lead-1',
      OR: [{ assignedToId: ADMIN.userId }, { assignedToId: null }],
    });
  });
});
