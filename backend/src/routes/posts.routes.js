import { Router } from 'express';
import { getPostsHandler, getPostByIdHandler, createPostHandler } from '../controllers/posts.controller.js';
import { requireAuth } from '../middleware/auth.js';

// Owner: TV1 (BE03, BE04 - /api/posts)
export const postsRouter = Router();

// BE04: Xem danh sách bài viết (bảng tin công khai)
postsRouter.get('/', getPostsHandler);

// BE04: Xem chi tiết một bài viết công khai
postsRouter.get('/:id', getPostByIdHandler);

// BE03: Tạo bài viết công thức mới (yêu cầu đăng nhập)
postsRouter.post('/', requireAuth, createPostHandler);
