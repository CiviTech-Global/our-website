import type { Response } from 'express';

interface ApiResponseOptions {
  success: boolean;
  data?: unknown;
  message?: string;
  statusCode?: number;
  meta?: Record<string, unknown>;
}

function apiResponse(res: Response, options: ApiResponseOptions) {
  const { success, data, message, statusCode = 200, meta } = options;
  return res.status(statusCode).json({
    success,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function successResponse(res: Response, data: unknown, message?: string, statusCode = 200) {
  return apiResponse(res, { success: true, data, message, statusCode });
}

export function errorResponse(res: Response, message: string, statusCode = 400) {
  return apiResponse(res, { success: false, message, statusCode });
}

export function paginatedResponse(
  res: Response,
  data: unknown,
  total: number,
  page: number,
  limit: number,
  message?: string,
) {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
