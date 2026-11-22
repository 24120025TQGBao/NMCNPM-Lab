import { Router } from 'express';
import { createSuggestionsController } from '../controllers/suggestions.controller.js';
import { getServiceRoleClient } from '../lib/supabase.js';

const serviceRoleClient = {
  from(table) {
    return getServiceRoleClient().from(table);
  }
};

export function createSuggestionsRouter(client = serviceRoleClient, options) {
  const router = Router();
  const controller = createSuggestionsController(client, options);

  router.get('/', controller.getSuggestions);

  return router;
}

export const suggestionsRouter = createSuggestionsRouter();
