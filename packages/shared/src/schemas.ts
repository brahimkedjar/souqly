import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const feedActionSchema = z.enum([
  'VIEW',
  'CLICK',
  'FAVORITE',
  'ADD_TO_CART',
  'BUY',
  'CHAT',
]);

export const feedEventSchema = z.object({
  listingId: z.string().uuid(),
  action: feedActionSchema,
});

export type PaginationInput = z.input<typeof paginationSchema>;
export type PaginationOutput = z.output<typeof paginationSchema>;
export type FeedEventInput = z.input<typeof feedEventSchema>;

