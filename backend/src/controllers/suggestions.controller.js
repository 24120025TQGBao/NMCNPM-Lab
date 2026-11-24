import { suggestionsQuerySchema } from '../schemas/suggestions.schema.js';
import { createSuggestionsService } from '../services/suggestions.service.js';

export function createSuggestionsController(client, options) {
  const service = createSuggestionsService(client, options);

  return {
    async getSuggestions(req, res, next) {
      try {
        const params = suggestionsQuerySchema.parse(req.query);
        const data = await service.getSuggestions(params);
        return res.status(200).json({ data });
      } catch (error) {
        return next(error);
      }
    }
  };
}
