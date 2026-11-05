import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination.js';

export const listPostsQuerySchema = paginationQuerySchema;

export const postIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Định danh bài viết (id) phải là một UUID hợp lệ' })
});

