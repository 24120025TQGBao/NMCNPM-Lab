import { Router } from 'express';
import { createDishesController } from '../controllers/dishes.controller.js';
import { getServiceRoleClient } from '../lib/supabase.js';

const defaultClient = {
  rpc(name, args) { return getServiceRoleClient().rpc(name, args); }
};

export function createRecipesRouter(client = defaultClient) {
  const router = Router();
  router.get('/:id', createDishesController(client).getRecipeById);
  return router;
}
