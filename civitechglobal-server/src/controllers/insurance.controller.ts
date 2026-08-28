import type { Request, Response, NextFunction } from 'express';
import * as insuranceService from '../services/insurance.service.js';
import { successResponse } from '../utils/apiResponse.js';

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await insuranceService.getAllCategories();
    successResponse(res, categories);
  } catch (error) {
    next(error);
  }
}
