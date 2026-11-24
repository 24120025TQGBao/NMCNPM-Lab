import { get } from '../client'
import { invalidResponseError } from '../errors'
import { mapPage, mapRecipeDetail, mapRecipeSummary, unwrap } from '../mappers'

const id = encodeURIComponent

// BE09: danh sách phân trang và chi tiết công thức công khai.
export const recipes = {
  async listByDish(dishId, { page, limit, signal } = {}) {
    return mapPage(await get(`/dishes/${id(dishId)}/recipes`, { query: { page, limit }, signal, mockable: true }), mapRecipeSummary)
  },
  async get(recipeId, { signal } = {}) {
    const raw = unwrap(await get(`/recipes/${id(recipeId)}`, { signal, mockable: true }))
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.id == null) throw invalidResponseError(200)
    return mapRecipeDetail(raw)
  },
}
