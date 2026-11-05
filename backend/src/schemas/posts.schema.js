import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination.js';

export const listPostsQuerySchema = paginationQuerySchema;

export const postIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Định danh bài viết (id) phải là một UUID hợp lệ' })
});

// Schema cho từng nguyên liệu trong bài viết
export const postIngredientSchema = z
  .object({
    ingredient_id: z.string().uuid({ message: 'Định danh nguyên liệu phải là UUID hợp lệ' }).optional().nullable(),
    name: z
      .string()
      .trim()
      .min(1, { message: 'Tên nguyên liệu không được để trống' })
      .max(100, { message: 'Tên nguyên liệu không được vượt quá 100 ký tự' })
      .optional()
      .nullable(),
    quantity: z
      .number({ invalid_type_error: 'Định lượng phải là một số' })
      .positive({ message: 'Định lượng phải là số lớn hơn 0' })
      .optional()
      .nullable(),
    unit: z
      .string()
      .trim()
      .min(1, { message: 'Đơn vị không được để trống' })
      .max(30, { message: 'Đơn vị không được vượt quá 30 ký tự' })
      .optional()
      .nullable()
  })
  .refine(data => Boolean(data.ingredient_id || data.name), {
    message: 'Nguyên liệu phải có ít nhất một trong hai: mã nguyên liệu (ingredient_id) hoặc tên nguyên liệu (name)',
    path: ['name']
  });

// Schema cho từng bước nấu
export const postStepSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: 'Nội dung bước nấu không được để trống' })
    .max(1000, { message: 'Nội dung bước nấu không được vượt quá 1000 ký tự' })
});

// Schema cho request body POST /api/posts
export const createPostSchema = z
  .object({
    dish_id: z.string().uuid({ message: 'Mã món ăn (dish_id) phải là UUID hợp lệ' }),
    title: z
      .string()
      .trim()
      .min(3, { message: 'Tiêu đề bài viết phải có ít nhất 3 ký tự' })
      .max(150, { message: 'Tiêu đề bài viết không được vượt quá 150 ký tự' }),
    ingredients: z
      .array(postIngredientSchema)
      .min(1, { message: 'Bài viết phải có ít nhất 1 nguyên liệu' })
      .max(50, { message: 'Bài viết không được có quá 50 nguyên liệu' }),
    steps: z
      .array(postStepSchema)
      .min(1, { message: 'Bài viết phải có ít nhất 1 bước thực hiện' })
      .max(50, { message: 'Bài viết không được có quá 50 bước thực hiện' })
  })
  .strip(); // Tự động loại bỏ bất kỳ trường lạ nào như author_id, user_id
