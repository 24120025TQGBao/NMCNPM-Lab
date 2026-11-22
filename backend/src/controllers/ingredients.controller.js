import { searchIngredientsQuerySchema } from '../schemas/ingredients.schema.js';
import { createIngredientsService } from '../services/ingredients.service.js';

export function createIngredientsController(client) {
  const service = createIngredientsService(client);

  return {
    async searchIngredients(req, res, next) {
      try {
        const { search, limit } = searchIngredientsQuerySchema.parse(req.query);
        const data = await service.searchIngredients({ search, limit });
        return res.status(200).json({ data });
      } catch (error) {
        return next(error);
      }
    }
  };
}
