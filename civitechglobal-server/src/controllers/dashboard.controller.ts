import type { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service.js';
import { successResponse } from '../utils/apiResponse.js';

export async function getAdminDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboard = await dashboardService.getAdminDashboard();
    successResponse(res, dashboard);
  } catch (error) {
    next(error);
  }
}
