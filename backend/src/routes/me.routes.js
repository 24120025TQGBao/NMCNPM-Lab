import { Router } from 'express';
import { createMeController } from '../controllers/me.controller.js';
import { getServiceRoleClient } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const serviceRoleProfileClient = {
  from(table) {
    return getServiceRoleClient().from(table);
  }
};

export function createMeRouter(profileClient = serviceRoleProfileClient) {
  const router = Router();

  router.get('/', requireAuth, createMeController(profileClient));

  return router;
}
