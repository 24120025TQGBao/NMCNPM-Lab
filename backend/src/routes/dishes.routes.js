import { Router } from 'express';
import { createDishesController } from '../controllers/dishes.controller.js';
import { getServiceRoleClient } from '../lib/supabase.js';
import { createDishesMatchRouter } from './dishes-match.routes.js';

const defaultClient = {
  rpc(name, args) { 
    return getServiceRoleClient().rpc(name, args); 
  }
};

export function createDishesRouter(client = defaultClient) {
  const router = Router();
  const controller = createDishesController(client);
  router.get('/', controller.getDishes);
  router.get('/search', controller.searchByName);
  router.use('/match', createDishesMatchRouter());
  router.get('/:id', controller.getDishById);
  return router;
}

export const dishesRouter = createDishesRouter();
