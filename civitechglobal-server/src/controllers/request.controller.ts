import type { Request, Response, NextFunction } from 'express';
import * as requestService from '../services/request.service.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';
import type { RequestListQuery } from '../validators/request.schema.js';

function principalFrom(req: Request): requestService.RequestingPrincipal {
  return { userId: req.user!.userId, role: req.user!.role };
}

export async function getAllRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await requestService.getAllRequests(
      req.query as unknown as RequestListQuery,
      principalFrom(req),
    );
    paginatedResponse(res, result.requests, result.total, result.page, result.limit);
  } catch (error) {
    next(error);
  }
}

export async function getRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const detail = await requestService.getRequestById(req.params.id as string, principalFrom(req));
    successResponse(res, detail);
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await requestService.updateRequestStatus(
      req.params.id as string,
      req.body.status,
      principalFrom(req),
    );
    successResponse(res, updated, 'Request status updated');
  } catch (error) {
    next(error);
  }
}

export async function assignRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await requestService.assignRequest(
      req.params.id as string,
      req.body.assignedToId,
      principalFrom(req),
    );
    successResponse(res, updated, 'Request assignment updated');
  } catch (error) {
    next(error);
  }
}

export async function scheduleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scheduledAt = req.body.scheduledAt === null ? null : new Date(req.body.scheduledAt);
    const updated = await requestService.scheduleCallback(
      req.params.id as string,
      scheduledAt,
      principalFrom(req),
    );
    successResponse(res, updated, 'Callback scheduled');
  } catch (error) {
    next(error);
  }
}

export async function getRequestStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await requestService.getRequestStats(principalFrom(req));
    successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}
