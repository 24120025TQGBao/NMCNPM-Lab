import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination.js';

export const listPostsQuerySchema = paginationQuerySchema;

// ID bài viết là số nguyên dương (bigint trong DB)
export const postIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,14}$/, { message: 'Định danh bài viết (id) phải là số nguyên dương' })
    .transform(Number)
});

// Làm sạch văn bản: bỏ thẻ HTML và ký tự điều khiển (giữ xuống dòng, tab), rồi trim
function cleanText(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function textField(label, { min = 1, max }) {
  return z
    .string({ invalid_type_error: `${label} phải là chuỗi ký tự` })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, { message: min === 1 ? `${label} không được để trống` : `${label} phải có ít nhất ${min} ký tự` })
        .max(max, { message: `${label} không được vượt quá ${max} ký tự` })
    );
}

function positiveInt(label) {
  return z
    .number({ invalid_type_error: `${label} phải là số nguyên dương` })
    .int({ message: `${label} phải là số nguyên dương` })
    .positive({ message: `${label} phải là số nguyên dương` });
}

export const postIngredientSchema = z
  .object({
    ingredient_id: positiveInt('Mã nguyên liệu').optional().nullable(),
    name: textField('Tên nguyên liệu', { max: 100 }).optional().nullable(),
    quantity: z
      .number({ invalid_type_error: 'Định lượng phải là một số' })
      .positive({ message: 'Định lượng phải là số lớn hơn 0' })
      .optional()
      .nullable(),
    unit: textField('Đơn vị', { max: 30 }).optional().nullable(),
    role: z.enum(['PRIMARY', 'SECONDARY'], { message: 'Vai trò phải là PRIMARY hoặc SECONDARY' }).optional()
  })
  .refine(data => Boolean(data.ingredient_id || data.name), {
    message: 'Nguyên liệu phải có ít nhất một trong hai: ingredient_id hoặc name',
    path: ['name']
  });

export const postStepSchema = z.object({
  content: textField('Nội dung bước nấu', { max: 1000 })
});

// Request body POST /api/posts. Trường lạ (author_id, user_id...) tự bị loại bỏ.
export const createPostSchema = z
  .object({
    dish_id: positiveInt('Mã món ăn (dish_id)'),
    title: textField('Tiêu đề bài viết', { min: 3, max: 150 }),
    content: textField('Nội dung bài viết', { max: 2000 }).optional().nullable(),
    ingredients: z
      .array(postIngredientSchema)
      .min(1, { message: 'Bài viết phải có ít nhất 1 nguyên liệu' })
      .max(50, { message: 'Bài viết không được có quá 50 nguyên liệu' }),
    steps: z
      .array(postStepSchema)
      .min(1, { message: 'Bài viết phải có ít nhất 1 bước thực hiện' })
      .max(50, { message: 'Bài viết không được có quá 50 bước thực hiện' })
  })
  .superRefine((data, ctx) => {
    const seen = new Set();
    data.ingredients.forEach((ing, index) => {
      const key = ing.ingredient_id ? `id:${ing.ingredient_id}` : ing.name ? `name:${ing.name.toLowerCase()}` : null;
      if (!key) return;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ingredients', index],
          message: 'Nguyên liệu bị trùng trong cùng công thức'
        });
      }
      seen.add(key);
    });
  });