import { Router } from 'express';
import { postsRouter } from './posts.routes.js';
import { createDishesRouter } from './dishes.routes.js';
import { createRecipesRouter } from './recipes.routes.js';

export function createApiRouter({ dishesClient } = {}) {
  const apiRouter = Router();
  apiRouter.use('/posts', postsRouter);
  apiRouter.use('/dishes', createDishesRouter(dishesClient));
  apiRouter.use('/recipes', createRecipesRouter(dishesClient));
  return apiRouter;
}

export const apiRouter = createApiRouter();
