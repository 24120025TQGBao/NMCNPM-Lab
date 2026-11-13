import { Router } from 'express';
import { createDishesController } from '../controllers/dishes.controller.js';
import { getServiceRoleClient } from '../lib/supabase.js';

const serviceRoleClient = {
  rpc(name, args) {
    return getServiceRoleClient().rpc(name, args);
  }
};

export function createDishesRouter(client = serviceRoleClient) {
  const router = Router();
  const controller = createDishesController(client);

  router.get('/', controller.getDishes);
  router.get('/search', controller.searchByName);

  return router;
}

export const dishesRouter = createDishesRouter();

