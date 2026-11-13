import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .refine(val => /^\d+$/.test(val) && parseInt(val, 10) >= 1 && parseInt(val, 10) <= 1000000, {
      message: 'Số trang page phải là số nguyên từ 1 đến 1000000'
    })
    .transform(val => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('20')
    .refine(val => /^\d+$/.test(val) && parseInt(val, 10) >= 1 && parseInt(val, 10) <= 50, {
      message: 'Giới hạn limit phải là số nguyên từ 1 đến 50'
    })
    .transform(val => parseInt(val, 10))
});

export function getPaginationRange(page, limit) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

