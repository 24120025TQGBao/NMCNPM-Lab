import { Router } from 'express';
import { getAnonClient } from '../lib/supabase.js';
import { createDishesMatchController } from '../controllers/dishes-match.controller.js';

const anonymousMatchClient = {
  rpc(name, args) { return getAnonClient().rpc(name, args); },
  from(table) { return getAnonClient().from(table); }
};

export function createDishesMatchRouter(client = anonymousMatchClient) {
  const router = Router();
  const controller = createDishesMatchController(client);
  router.get('/', controller.matchDishes);
  return router;
}
