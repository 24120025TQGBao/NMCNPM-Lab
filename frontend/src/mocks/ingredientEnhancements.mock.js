import { fetchMockDishMatch } from './dishMatch.mock'
import { mapMatchDishList } from '../api/adapters'

// Explicit mock fixture metadata, never inferred from a missing[] response in production.
const ingredientIdsByDish = new Map([
  [101, [1, 3, 8, 10]], [102, [4, 6, 7, 10, 2]], [103, [5, 6, 10, 18]],
  [104, [8, 10, 201, 13, 14]], [105, [6, 16, 17, 202, 203, 204, 205, 206]],
  [106, [6, 8, 11]], [107, [1, 8, 207]],
])

export async function fetchMockDishIdsUsingIngredient(id, { signal } = {}) {
  signal?.throwIfAborted()
  return [...ingredientIdsByDish].filter(([, ids]) => ids.includes(id)).map(([dishId]) => dishId)
}

export async function fetchMockPurchaseSuggestions({ ingredients, pantry, signal }) {
  signal?.throwIfAborted()
  const dishes = mapMatchDishList(await fetchMockDishMatch({ ingredients: ingredients.join(','), pantry }))
  signal?.throwIfAborted()
  const byIngredient = new Map()
  for (const dish of dishes) {
    if (dish.isIncomplete || dish.missing.length !== 1 ||
        !ingredientIdsByDish.get(dish.id)?.some(id => ingredients.includes(id))) continue
    const ingredient = dish.missing[0]
    if (ingredients.includes(ingredient.id)) continue
    if (!byIngredient.has(ingredient.id)) byIngredient.set(ingredient.id, { ingredient, dishIds: new Set() })
    byIngredient.get(ingredient.id).dishIds.add(dish.id)
  }
  return [...byIngredient.values()].map(({ ingredient, dishIds }) => ({
    ingredient: { id: ingredient.id, name: ingredient.name }, unlockCount: dishIds.size, dishIds: [...dishIds].sort((a,b) => a-b),
  })).sort((a,b) => b.unlockCount-a.unlockCount || a.ingredient.id-b.ingredient.id).slice(0,10)
}
