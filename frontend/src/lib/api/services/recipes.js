import { get } from '../client'
import { mapPage, mapRecipeDetail, mapRecipeSummary, unwrap } from '../mappers'

const id = encodeURIComponent

// Toàn bộ là giả định (chưa có contract).
export const recipes = {
  async listByDish(dishId, { page, limit, signal } = {}) {
    return mapPage(await get(`/dishes/${id(dishId)}/recipes`, { query: { page, limit }, signal, mockable: true }), mapRecipeSummary)
  },
  async get(recipeId, { signal } = {}) {
    return mapRecipeDetail(unwrap(await get(`/recipes/${id(recipeId)}`, { signal, mockable: true })))
  },
}
