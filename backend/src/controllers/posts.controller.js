import * as postsService from '../services/posts.service.js';
import { listPostsQuerySchema, postIdParamSchema, createPostSchema } from '../schemas/posts.schema.js';

export async function getPostsHandler(req, res, next) {
  try {
    const query = listPostsQuerySchema.parse(req.query);
    const result = await postsService.listPosts(query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getPostByIdHandler(req, res, next) {
  try {
    const { id } = postIdParamSchema.parse(req.params);
    const post = await postsService.getPostById(id);
    return res.status(200).json({ data: post });
  } catch (err) {
    return next(err);
  }
}

export async function createPostHandler(req, res, next) {
  try {
    const input = createPostSchema.parse(req.body);
    const { userId, accessToken } = req.auth;

    const newPost = await postsService.createPost({
      userId,
      accessToken,
      input
    });

    return res.status(201).json({ data: newPost });
  } catch (err) {
    return next(err);
  }
}
