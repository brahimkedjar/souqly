export function parsePagination(query: any, defaultLimit = 20) {
  const page = Math.max(parseInt(query?.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query?.limit, 10) || defaultLimit, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

