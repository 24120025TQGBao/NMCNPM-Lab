import { z } from 'zod';

const SEARCH_MAX_LENGTH = 50;
const LIMIT_DEFAULT = 8;
const LIMIT_MAX = 20;

// Chỉ nhận một giá trị chuỗi duy nhất cho mỗi tham số (`?search=a&search=b` bị từ chối).
export const searchIngredientsQuerySchema = z.object({
  search: z
    .string({
      required_error: 'search là bắt buộc',
      invalid_type_error: 'search phải là một chuỗi'
    })
    .transform(value => value.trim())
    .refine(value => value.length >= 1 && value.length <= SEARCH_MAX_LENGTH, {
      message: `search phải có từ 1 đến ${SEARCH_MAX_LENGTH} ký tự`
    }),
  limit: z
    .string({ invalid_type_error: 'limit phải là một số nguyên' })
    .optional()
    .refine(
      value => value === undefined || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= LIMIT_MAX),
      { message: `limit phải là số nguyên từ 1 đến ${LIMIT_MAX}` }
    )
    .transform(value => (value === undefined ? LIMIT_DEFAULT : Number(value)))
});
