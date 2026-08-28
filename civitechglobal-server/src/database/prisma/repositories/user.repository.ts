import { prisma } from '../../../config/database.js';
import type { Prisma } from '@prisma/client';

const userDelegate = prisma.user;

export const userRepository = {
  findMany: (args?: Prisma.UserFindManyArgs) => userDelegate.findMany(args),
  count: (args?: Prisma.UserCountArgs) => userDelegate.count(args),
  // Generic (rather than the fixed Prisma.UserFindUniqueArgs the other
  // methods use) so a caller's `select`/`include` — e.g. pulling in the
  // AdminRole relation — is reflected in the inferred return type instead
  // of collapsing to the default scalar-only shape.
  findUnique: <T extends Prisma.UserFindUniqueArgs>(args: Prisma.SelectSubset<T, Prisma.UserFindUniqueArgs>) =>
    userDelegate.findUnique(args),
  findFirst: (args: Prisma.UserFindFirstArgs) => userDelegate.findFirst(args),
  create: (args: Prisma.UserCreateArgs) => userDelegate.create(args),
  update: <T extends Prisma.UserUpdateArgs>(args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>) =>
    userDelegate.update(args),
  updateMany: (args: Prisma.UserUpdateManyArgs) => userDelegate.updateMany(args),
};
