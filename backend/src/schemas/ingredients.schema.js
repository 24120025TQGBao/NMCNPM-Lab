import { z } from 'zod';
import { parseCsvIds } from '../utils/csv.js';

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

const SUGGEST_NEXT_INGREDIENTS_MAX = 30;

// GET /api/ingredients/suggest-next (BE12, docs/api.md mục 7.8).
export const suggestNextQuerySchema = z.object({
  ingredients: z
    .string({
      required_error: 'ingredients là bắt buộc',
      invalid_type_error: 'ingredients phải là một chuỗi'
    })
    .transform((value, ctx) => {
      const result = parseCsvIds(value, { max: SUGGEST_NEXT_INGREDIENTS_MAX, label: 'ingredients' });
      if (!result.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
        return z.NEVER;
      }
      if (result.values.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cần chọn ít nhất 1 nguyên liệu' });
        return z.NEVER;
      }
      return result.values;
    }),
  pantry: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'pantry phải là true hoặc false' }) })
    .optional()
    .transform(value => value !== 'false')
});
