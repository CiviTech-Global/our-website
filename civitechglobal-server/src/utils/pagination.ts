export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const MAX_LIMIT = 100;

export function getPaginationParams(query: { page?: number | string; limit?: number | string }): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(query.limit ?? '10'), 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
