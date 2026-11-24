import { Router } from 'express';
import { createMeRouter } from './me.routes.js';
import { postsRouter } from './posts.routes.js';
import { createDishesRouter } from './dishes.routes.js';
import { createRecipesRouter } from './recipes.routes.js';
import { createIngredientsRouter } from './ingredients.routes.js';
import { createSuggestionsRouter } from './suggestions.routes.js';

export function createApiRouter({ dishesClient, profileClient, ingredientsClient, suggestionsClient } = {}) {
  const apiRouter = Router();

  apiRouter.use('/me', createMeRouter(profileClient));
  apiRouter.use('/posts', postsRouter);
  apiRouter.use('/dishes', createDishesRouter(dishesClient));
  apiRouter.use('/recipes', createRecipesRouter(dishesClient));
  apiRouter.use('/ingredients', createIngredientsRouter(ingredientsClient));
  apiRouter.use('/suggestions', createSuggestionsRouter(suggestionsClient));

  return apiRouter;
}

export const apiRouter = createApiRouter();
