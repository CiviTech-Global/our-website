import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';
import * as identityService from '../services/identity-admin.service.js';
import { ALL_PERMISSIONS } from '../auth/permissions.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.getUsers(req.query);
    paginatedResponse(res, result.users, result.total, result.page, result.limit);
  } catch (error) {
    next(error);
  }
}

export async function getRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await adminService.getRoles();
    successResponse(res, roles);
  } catch (error) {
    next(error);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.updateUserRole(req.params.id as string, req.body.role);
    successResponse(res, user, 'User role updated');
  } catch (error) {
    next(error);
  }
}

export async function updateUserAdminRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.updateUserAdminRole(req.params.id as string, req.body.adminRoleId);
    successResponse(res, user, 'User admin role updated');
  } catch (error) {
    next(error);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.deactivateUser(req.params.id as string);
    successResponse(res, user, 'User deactivated');
  } catch (error) {
    next(error);
  }
}

export async function createAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await adminService.createAdmin(req.body);
    successResponse(res, user, 'حساب مدیر ساخته شد.', 201);
  } catch (error) {
    next(error);
  }
}

export async function setUserPermissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await adminService.setUserPermissions(
      req.params.id as string,
      req.body.permissions,
    );
    successResponse(res, user, 'دسترسی‌ها به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
}

export async function listPermissions(_req: Request, res: Response): Promise<void> {
  // The catalogue, so the admin screen renders whatever the server knows about
  // rather than a copy that drifts.
  successResponse(res, { permissions: ALL_PERMISSIONS });
}

export async function getIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await identityService.getIdentity(req.params.id as string));
  } catch (error) {
    next(error);
  }
}

export async function setIdentityStanding(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await identityService.setStanding(
      req.params.id as string,
      req.body.standing as identityService.IdentityStanding,
      { userId: req.user!.userId },
    );
    successResponse(res, updated, 'وضعیت این شناسه به‌روزرسانی شد.');
  } catch (error) {
    next(error);
  }
}
