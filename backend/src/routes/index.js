import { Router } from 'express';
import { createMeRouter } from './me.routes.js';
import { postsRouter } from './posts.routes.js';
import { createDishesRouter } from './dishes.routes.js';

export function createApiRouter({ dishesClient, profileClient } = {}) {
  const apiRouter = Router();

  apiRouter.use('/me', createMeRouter(profileClient));
  apiRouter.use('/posts', postsRouter);
  apiRouter.use('/dishes', createDishesRouter(dishesClient));

  return apiRouter;
}

export const apiRouter = createApiRouter();

