import { get } from '../lib/api/client'
import { mapMatchDishList } from './adapters'
import { fetchMockDishMatch } from '../mocks/dishMatch.mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'

export async function matchDishes({ ingredients, pantry = true, signal } = {}) {
  const ingStr = Array.isArray(ingredients) ? ingredients.join(',') : ingredients

  if (USE_MOCK) {
    const raw = await fetchMockDishMatch({ ingredients: ingStr, pantry })
    return mapMatchDishList(raw)
  }

  const raw = await get('/dishes/match', {
    query: { ingredients: ingStr, pantry: String(pantry) },
    signal,
  })
  return mapMatchDishList(raw)
}
