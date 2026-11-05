import { Router } from 'express';
import { getPostsHandler, getPostByIdHandler } from '../controllers/posts.controller.js';

// Owner: TV1 (BE03, BE04 - /api/posts)
export const postsRouter = Router();

// BE04: Xem danh sách bài viết (bảng tin công khai)
postsRouter.get('/', getPostsHandler);

// BE04: Xem chi tiết một bài viết công khai
postsRouter.get('/:id', getPostByIdHandler);

// TODO(BE03): POST /api/posts
