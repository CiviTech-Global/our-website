import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  insuranceRequestRepository: {
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

vi.mock('../database/prisma/repositories/insurance-request.repository.js', () => ({
  insuranceRequestRepository: mocks.insuranceRequestRepository,
}));
vi.mock('../database/prisma/repositories/user.repository.js', () => ({
  userRepository: mocks.userRepository,
}));

import * as requestService from './request.service.js';

const ADMIN = { userId: 'admin-1', role: 'ADMIN' } as const;
const SUPER_ADMIN = { userId: 'super-1', role: 'SUPER_ADMIN' } as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insuranceRequestRepository.count.mockResolvedValue(0);
});

describe('request.service row-level scoping', () => {
  it('getAllRequests scopes non-SUPER_ADMIN principals to their own or unassigned requests', async () => {
    mocks.insuranceRequestRepository.findManyWithRelations.mockResolvedValue([]);

    await requestService.getAllRequests({ page: 1, limit: 20 } as any, ADMIN);

    const callArgs = mocks.insuranceRequestRepository.findManyWithRelations.mock.calls[0][0];
    expect(callArgs.where).toEqual({
      OR: [{ assignedToId: ADMIN.userId }, { assignedToId: null }],
    });
  });

  it('getAllRequests does not scope SUPER_ADMIN principals', async () => {
    mocks.insuranceRequestRepository.findManyWithRelations.mockResolvedValue([]);

    await requestService.getAllRequests({ page: 1, limit: 20 } as any, SUPER_ADMIN);

    const callArgs = mocks.insuranceRequestRepository.findManyWithRelations.mock.calls[0][0];
    expect(callArgs.where).toEqual({});
  });

  // Regression test for the row-level-scoping bypass found in the platform
  // infrastructure audit: getRequestStats() previously ran unscoped counts,
  // leaking platform-wide request volume to any non-SUPER_ADMIN principal with
  // the `leads` permission.
  it('getRequestStats scopes every count to the requesting principal', async () => {
    await requestService.getRequestStats(ADMIN);

    expect(mocks.insuranceRequestRepository.count).toHaveBeenCalledTimes(6);
    for (const call of mocks.insuranceRequestRepository.count.mock.calls) {
      const where = call[0].where;
      expect(where.OR).toEqual([{ assignedToId: ADMIN.userId }, { assignedToId: null }]);
    }
  });

  it('getRequestStats does not scope SUPER_ADMIN principals', async () => {
    await requestService.getRequestStats(SUPER_ADMIN);

    for (const call of mocks.insuranceRequestRepository.count.mock.calls) {
      expect(call[0].where.OR).toBeUndefined();
    }
  });

  it('assignRequest rejects assignment to a nonexistent user', async () => {
    mocks.insuranceRequestRepository.findFirstWithRelations.mockResolvedValue({ id: 'req-1' });
    mocks.userRepository.findUnique.mockResolvedValue(null);

    await expect(requestService.assignRequest('req-1', 'ghost-user', SUPER_ADMIN)).rejects.toThrow('Assignee not found');
    expect(mocks.insuranceRequestRepository.assign).not.toHaveBeenCalled();
  });

  it('assignRequest rejects assignment to a deactivated user', async () => {
    mocks.insuranceRequestRepository.findFirstWithRelations.mockResolvedValue({ id: 'req-1' });
    mocks.userRepository.findUnique.mockResolvedValue({ id: 'user-2', deletedAt: new Date() });

    await expect(requestService.assignRequest('req-1', 'user-2', SUPER_ADMIN)).rejects.toThrow('Assignee not found');
    expect(mocks.insuranceRequestRepository.assign).not.toHaveBeenCalled();
  });

  it('assignRequest succeeds for an active user', async () => {
    mocks.insuranceRequestRepository.findFirstWithRelations.mockResolvedValue({ id: 'req-1' });
    mocks.userRepository.findUnique.mockResolvedValue({ id: 'user-2', deletedAt: null });
    mocks.insuranceRequestRepository.assign.mockResolvedValue({ id: 'req-1', assignedToId: 'user-2' });

    await requestService.assignRequest('req-1', 'user-2', SUPER_ADMIN);
    expect(mocks.insuranceRequestRepository.assign).toHaveBeenCalledWith('req-1', 'user-2');
  });

  it('assignRequest allows clearing the assignment without a user lookup', async () => {
    mocks.insuranceRequestRepository.findFirstWithRelations.mockResolvedValue({ id: 'req-1' });
    mocks.insuranceRequestRepository.assign.mockResolvedValue({ id: 'req-1', assignedToId: null });

    await requestService.assignRequest('req-1', null, SUPER_ADMIN);
    expect(mocks.userRepository.findUnique).not.toHaveBeenCalled();
    expect(mocks.insuranceRequestRepository.assign).toHaveBeenCalledWith('req-1', null);
  });

  it('getRequestById scopes the lookup and 404s outside the scope', async () => {
    mocks.insuranceRequestRepository.findFirstWithRelations.mockResolvedValue(null);

    await expect(requestService.getRequestById('req-1', ADMIN)).rejects.toThrow('Request not found');

    const where = mocks.insuranceRequestRepository.findFirstWithRelations.mock.calls[0][0];
    expect(where).toEqual({
      id: 'req-1',
      OR: [{ assignedToId: ADMIN.userId }, { assignedToId: null }],
    });
  });
});

/**
 * Searching must narrow a scoped list, never widen it.
 *
 * Both conditions are an OR: the scope is "mine or unassigned", the search is
 * "matches any of these columns". Merged into one object the second would
 * overwrite the first, and an admin searching a tracking code would read a
 * colleague's request. They have to be ANDed.
 */
describe('request.service search', () => {
  it('requires the scope and the search to both hold', async () => {
    mocks.insuranceRequestRepository.findManyWithRelations.mockResolvedValue([]);

    await requestService.getAllRequests({ page: 1, limit: 20, search: 'CTG-42' } as any, ADMIN);

    const { where } = mocks.insuranceRequestRepository.findManyWithRelations.mock.calls[0][0];
    expect(where).toEqual({
      AND: [
        { OR: [{ assignedToId: ADMIN.userId }, { assignedToId: null }] },
        {
          OR: [
            { trackingCode: { contains: 'CTG-42', mode: 'insensitive' } },
            { fullName: { contains: 'CTG-42', mode: 'insensitive' } },
            { phoneNumber: { contains: 'CTG-42', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('counts the same rows it lists', async () => {
    mocks.insuranceRequestRepository.findManyWithRelations.mockResolvedValue([]);

    await requestService.getAllRequests({ page: 1, limit: 20, search: 'ali' } as any, ADMIN);

    const listed = mocks.insuranceRequestRepository.findManyWithRelations.mock.calls[0][0].where;
    const counted = mocks.insuranceRequestRepository.count.mock.calls[0][0].where;
    expect(counted).toEqual(listed);
  });

  it('leaves the scope alone when nothing was searched for', async () => {
    mocks.insuranceRequestRepository.findManyWithRelations.mockResolvedValue([]);

    await requestService.getAllRequests({ page: 1, limit: 20, search: '  ' } as any, ADMIN);

    const { where } = mocks.insuranceRequestRepository.findManyWithRelations.mock.calls[0][0];
    expect(where).toEqual({ OR: [{ assignedToId: ADMIN.userId }, { assignedToId: null }] });
  });
});
