import { Router } from 'express';
import { createIngredientsController } from '../controllers/ingredients.controller.js';
import { getServiceRoleClient } from '../lib/supabase.js';

const serviceRoleClient = {
  rpc(name, args) {
    return getServiceRoleClient().rpc(name, args);
  },
  from(table) {
    return getServiceRoleClient().from(table);
  }
};

export function createIngredientsRouter(client = serviceRoleClient) {
  const router = Router();
  const controller = createIngredientsController(client);

  router.get('/', controller.searchIngredients);

  return router;
}

export const ingredientsRouter = createIngredientsRouter();
