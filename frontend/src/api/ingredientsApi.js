import { get } from '../lib/api/client'
import { mapIngredientList } from './adapters'
import { fetchMockIngredients } from '../mocks/ingredients.mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'

export async function searchIngredients({ search, limit = 8, signal } = {}) {
  if (USE_MOCK) {
    const raw = await fetchMockIngredients({ search, limit })
    return mapIngredientList(raw)
  }

  const raw = await get('/ingredients', { query: { search, limit }, signal })
  return mapIngredientList(raw)
}
