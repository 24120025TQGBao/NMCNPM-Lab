import { get } from '../lib/api/client'
import { mapPurchaseSuggestions } from './adapters'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'

export async function suggestNextIngredients({ ingredients, pantry = true, signal } = {}) {
  if (USE_MOCK) {
    const { fetchMockPurchaseSuggestions } = await import('../mocks/ingredientEnhancements.mock')
    return fetchMockPurchaseSuggestions({ ingredients, pantry, signal })
  }
  return mapPurchaseSuggestions(await get('/ingredients/suggest-next', {
    query: { ingredients: ingredients.join(','), pantry: String(pantry) }, signal,
  }))
}

// Existing catalog contract: one public recipe contains the requested ingredient.
// Fetch pages, not every dish/recipe individually; pinned IDs are unioned by the caller.
export async function getDishIdsUsingIngredient(ingredientId, { signal } = {}) {
  if (USE_MOCK) {
    const { fetchMockDishIdsUsingIngredient } = await import('../mocks/ingredientEnhancements.mock')
    return fetchMockDishIdsUsingIngredient(ingredientId, { signal })
  }
  const ids = new Set()
  for (let page = 1; ; page += 1) {
    signal?.throwIfAborted()
    const body = await get('/dishes', { query: { ingredients: ingredientId, page, limit: 50 }, signal })
    if (!Array.isArray(body?.data) || !Number.isSafeInteger(body.meta?.total) || body.meta.total < 0 ||
        body.data.some(dish => !Number.isSafeInteger(dish.id) || dish.id < 1)) {
      throw new Error('Không đọc được danh sách món dùng nguyên liệu đã ghim.')
    }
    const previous = ids.size
    body.data.forEach(dish => ids.add(dish.id))
    if (ids.size >= body.meta.total) return [...ids]
    if (body.data.length === 0 || ids.size === previous) {
      throw new Error('Không đọc đủ danh sách món dùng nguyên liệu đã ghim. Vui lòng thử lại.')
    }
  }
}
