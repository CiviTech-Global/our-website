import type { Response } from 'express';

interface ApiResponseOptions {
  success: boolean;
  data?: unknown;
  message?: string;
  statusCode?: number;
}

function apiResponse(res: Response, options: ApiResponseOptions) {
  const { success, data, message, statusCode = 200 } = options;
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
}

export function successResponse(res: Response, data: unknown, message?: string, statusCode = 200) {
  return apiResponse(res, { success: true, data, message, statusCode });
}

export function errorResponse(res: Response, message: string, statusCode = 400) {
  return apiResponse(res, { success: false, message, statusCode });
}
