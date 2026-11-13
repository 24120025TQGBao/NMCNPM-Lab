import { Router } from 'express';
import { postsRouter } from './posts.routes.js';
import { createDishesRouter } from './dishes.routes.js';

export function createApiRouter({ dishesClient } = {}) {
  const apiRouter = Router();

  apiRouter.use('/posts', postsRouter);
  apiRouter.use('/dishes', createDishesRouter(dishesClient));

  return apiRouter;
}

export const apiRouter = createApiRouter();

