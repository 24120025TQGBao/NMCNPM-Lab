import { Router } from 'express';
import { createMeRouter } from './me.routes.js';
import { postsRouter } from './posts.routes.js';
import { createDishesRouter } from './dishes.routes.js';
import { createIngredientsRouter } from './ingredients.routes.js';

export function createApiRouter({ dishesClient, profileClient, ingredientsClient } = {}) {
  const apiRouter = Router();

  apiRouter.use('/me', createMeRouter(profileClient));
  apiRouter.use('/posts', postsRouter);
  apiRouter.use('/dishes', createDishesRouter(dishesClient));
  apiRouter.use('/ingredients', createIngredientsRouter(ingredientsClient));

  return apiRouter;
}

export const apiRouter = createApiRouter();

