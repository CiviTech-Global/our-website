import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';
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
