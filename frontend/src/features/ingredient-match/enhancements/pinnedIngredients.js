// Only selected, canonical ingredient IDs can be pinned.
export function retainSelectedPins(pinnedIds, selectedIds) {
  const selected = new Set(selectedIds)
  return [...new Set(pinnedIds)].filter(id => selected.has(id))
}

export function togglePinnedIngredient(pinnedIds, id, selectedIds) {
  const retained = retainSelectedPins(pinnedIds, selectedIds)
  if (!selectedIds.includes(id)) return retained
  return retained.includes(id) ? retained.filter(value => value !== id) : [...retained, id]
}

// Metadata must list ingredients actually present in the dish/recipe.
// FE09 match responses contain only missing ingredients: never infer presence from that array.
// Preserve group boundaries, isIncomplete handling, API ratios, and relative order within each priority.
export function prioritizePinnedDishes(groups, pinnedIds, ingredientIdsByDish) {
  const pinned = new Set(pinnedIds)
  return groups.map(group => {
    const preferred = []
    const remaining = []
    for (const dish of group.items) {
      const ids = ingredientIdsByDish.get(dish.id) ?? []
      const destination = ids.some(id => pinned.has(id)) ? preferred : remaining
      destination.push(dish)
    }
    return { ...group, items: [...preferred, ...remaining] }
  })
}
