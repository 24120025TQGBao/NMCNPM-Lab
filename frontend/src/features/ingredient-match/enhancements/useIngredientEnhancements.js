import { useEffect, useMemo, useRef, useState } from 'react'
import { useSuggestSession } from '../../suggest/SuggestSessionContext'
import { getDishIdsUsingIngredient, suggestNextIngredients } from '../../../api/ingredientEnhancementsApi'
import { prioritizePinnedDishes } from './pinnedIngredients'

const EMPTY_IDS = []

export function useIngredientEnhancements({ ingredients, pantry, results, queryKey, groups }) {
  const { state, dispatch } = useSuggestSession()
  const pinnedIds = state.match.pinnedIds ?? EMPTY_IDS
  const shoppingDishIds = state.match.shoppingDishIds ?? EMPTY_IDS
  const ingredientKey = ingredients.map(item => item.id).sort((a,b) => a-b).join(',')
  const isCurrent = results !== null && queryKey === `${ingredientKey}|${pantry}`
  const requestKey = isCurrent ? queryKey : null
  const pinKey = [...pinnedIds].sort((a,b) => a-b).join(',')
  const [purchase, setPurchase] = useState({ key: null, items: [], loading: false, error: false })
  const [pinState, setPinState] = useState({ key: null, index: new Map(), loading: false, error: false })
  const [purchaseRetry, setPurchaseRetry] = useState(0)
  const [pinRetry, setPinRetry] = useState(0)
  const membershipCache = useRef(new Map())
  const purchaseKey = requestKey ? `${requestKey}|retry:${purchaseRetry}` : null
  const pinRequestKey = pinKey ? `${pinKey}|retry:${pinRetry}` : null

  useEffect(() => {
    if (!purchaseKey || !ingredientKey) return
    const controller = new AbortController()
    suggestNextIngredients({ ingredients: ingredientKey.split(',').map(Number), pantry, signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setPurchase({ key: purchaseKey, items, loading: false, error: false }) })
      .catch(() => { if (!controller.signal.aborted) setPurchase({ key: purchaseKey, items: [], loading: false, error: true }) })
    return () => controller.abort()
  }, [purchaseKey, ingredientKey, pantry])

  useEffect(() => {
    if (!pinRequestKey) return
    const controller = new AbortController()
    const ids = pinKey.split(',').map(Number)
    Promise.all(ids.map(async id => {
      if (membershipCache.current.has(id)) return [id, membershipCache.current.get(id)]
      const dishes = await getDishIdsUsingIngredient(id, { signal: controller.signal })
      if (!controller.signal.aborted) membershipCache.current.set(id, dishes)
      return [id, dishes]
    })).then(entries => {
      if (controller.signal.aborted) return
      const index = new Map()
      for (const [ingredientId, dishes] of entries) {
        for (const dishId of dishes) index.set(dishId, [...(index.get(dishId) ?? []), ingredientId])
      }
      setPinState({ key: pinRequestKey, index, loading: false, error: false })
    }).catch(() => {
      if (!controller.signal.aborted) setPinState({ key: pinRequestKey, index: new Map(), loading: false, error: true })
    })
    return () => controller.abort()
  }, [pinKey, pinRequestKey])

  const orderedGroups = useMemo(() => {
    if (!isCurrent || !pinKey || pinState.key !== pinRequestKey || pinState.loading || pinState.error) return groups
    return prioritizePinnedDishes(groups ?? [], pinnedIds, pinState.index)
  }, [isCurrent, groups, pinKey, pinRequestKey, pinState, pinnedIds])
  return {
    isCurrent, pinnedIds, shoppingDishIds, orderedGroups,
    selectedDishes: isCurrent ? (results ?? []).filter(dish => shoppingDishIds.includes(dish.id)) : [],
    purchase: isCurrent && purchase.key === purchaseKey ? purchase : { items: [], loading: Boolean(purchaseKey), error: false },
    pinLoading: Boolean(pinKey) && (pinState.key !== pinRequestKey || pinState.loading),
    pinError: Boolean(pinKey) && pinState.key === pinRequestKey && pinState.error,
    togglePin: id => dispatch({ type: 'TOGGLE_MATCH_PIN', payload: id }),
    toggleShoppingDish: id => dispatch({ type: 'TOGGLE_SHOPPING_DISH', payload: id }),
    clearShoppingDishes: () => dispatch({ type: 'CLEAR_SHOPPING_DISHES' }),
    retryPurchase: () => setPurchaseRetry(value => value+1),
    retryPins: () => { membershipCache.current.clear(); setPinRetry(value => value+1) },
  }
}
