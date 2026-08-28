import { prisma } from '../../../config/database.js';
import type { Prisma } from '@prisma/client';

const refreshTokenDelegate = prisma.refreshToken;

export const refreshTokenRepository = {
  findUnique: (args: Prisma.RefreshTokenFindUniqueArgs) => refreshTokenDelegate.findUnique(args),
  create: (args: Prisma.RefreshTokenCreateArgs) => refreshTokenDelegate.create(args),
  update: (args: Prisma.RefreshTokenUpdateArgs) => refreshTokenDelegate.update(args),
  updateMany: (args: Prisma.RefreshTokenUpdateManyArgs) => refreshTokenDelegate.updateMany(args),
};
