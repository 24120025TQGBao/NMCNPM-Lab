import { searchIngredientsQuerySchema, suggestNextQuerySchema } from '../schemas/ingredients.schema.js';
import { createIngredientsService } from '../services/ingredients.service.js';
import { createSuggestNextService } from '../services/suggestNext.service.js';

export function createIngredientsController(client) {
  const service = createIngredientsService(client);
  const suggestNextService = createSuggestNextService(client);

  return {
    async searchIngredients(req, res, next) {
      try {
        const { search, limit } = searchIngredientsQuerySchema.parse(req.query);
        const data = await service.searchIngredients({ search, limit });
        return res.status(200).json({ data });
      } catch (error) {
        return next(error);
      }
    },

    async suggestNext(req, res, next) {
      try {
        const { ingredients, pantry } = suggestNextQuerySchema.parse(req.query);
        const data = await suggestNextService.suggestNext({ ingredients, pantry });
        return res.status(200).json({ data });
      } catch (error) {
        return next(error);
      }
    }
  };
}
