import { retainSelectedPins, togglePinnedIngredient } from '../ingredient-match/enhancements/pinnedIngredients'

export const STORAGE_KEY = 'hnag:suggest-session:v1'

export const initialSessionState = {
  suggest: {
    chips: [],
    region: null,
    history: [],
    index: -1,
    skippedIds: [],
  },
  match: {
    ingredients: [],
    pantry: true,
    results: null,
    queryKey: null,
    pinnedIds: [],
    shoppingDishIds: [],
  },
}

export function loadSession() {
  if (typeof window === 'undefined') return initialSessionState
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return initialSessionState
    const parsed = JSON.parse(raw)
    return {
      suggest: {
        chips: Array.isArray(parsed.suggest?.chips) ? parsed.suggest.chips : [],
        region: parsed.suggest?.region ?? null,
        history: Array.isArray(parsed.suggest?.history) ? parsed.suggest.history : [],
        index: typeof parsed.suggest?.index === 'number' ? parsed.suggest.index : -1,
        skippedIds: Array.isArray(parsed.suggest?.skippedIds) ? parsed.suggest.skippedIds : [],
      },
      match: {
        ingredients: Array.isArray(parsed.match?.ingredients) ? parsed.match.ingredients : [],
        pantry: typeof parsed.match?.pantry === 'boolean' ? parsed.match.pantry : true,
        results: Array.isArray(parsed.match?.results) ? parsed.match.results : null,
        queryKey: typeof parsed.match?.queryKey === 'string' ? parsed.match.queryKey : null,
        pinnedIds: retainSelectedPins(
          Array.isArray(parsed.match?.pinnedIds) ? parsed.match.pinnedIds : [],
          Array.isArray(parsed.match?.ingredients) ? parsed.match.ingredients.map(item => item.id) : [],
        ),
        shoppingDishIds: Array.isArray(parsed.match?.shoppingDishIds)
          ? [...new Set(parsed.match.shoppingDishIds)].filter(id => parsed.match?.results?.some(dish => dish.id === id && dish.missing?.length > 0)) : [],
      },
    }
  } catch {
    return initialSessionState
  }
}

export function sessionReducer(state, action) {
  switch (action.type) {
    // --- SUGGEST TAB ACTIONS ---
    case 'SET_SUGGEST_CHIPS': {
      const chips = action.payload
      return {
        ...state,
        suggest: {
          ...state.suggest,
          chips,
          history: [],
          index: -1,
          skippedIds: [],
        },
      }
    }
    case 'SET_SUGGEST_REGION': {
      return {
        ...state,
        suggest: {
          ...state.suggest,
          region: action.payload,
          history: [],
          index: -1,
          skippedIds: [],
        },
      }
    }
    case 'PUSH_SUGGEST_HISTORY': {
      const newDish = action.payload
      const existing = state.suggest.history
      if (existing.some((d) => d.id === newDish.id)) {
        return state
      }
      const updated = [...existing, newDish]
      return {
        ...state,
        suggest: {
          ...state.suggest,
          history: updated,
          index: updated.length - 1,
        },
      }
    }
    case 'SET_SUGGEST_INDEX': {
      const nextIndex = action.payload
      if (nextIndex < 0 || nextIndex >= state.suggest.history.length) return state
      return {
        ...state,
        suggest: {
          ...state.suggest,
          index: nextIndex,
        },
      }
    }
    case 'SKIP_SUGGEST_DISH': {
      const dishId = action.payload
      const skipped = state.suggest.skippedIds.includes(dishId)
        ? state.suggest.skippedIds
        : [...state.suggest.skippedIds, dishId]
      return {
        ...state,
        suggest: {
          ...state.suggest,
          skippedIds: skipped,
        },
      }
    }
    case 'RESET_SUGGEST_HISTORY': {
      return {
        ...state,
        suggest: {
          ...state.suggest,
          history: [],
          index: -1,
          skippedIds: [],
        },
      }
    }

    // --- INGREDIENT MATCH TAB ACTIONS ---
    case 'SET_MATCH_INGREDIENTS': {
      return {
        ...state,
        match: {
          ...state.match,
          ingredients: action.payload,
          pinnedIds: retainSelectedPins(state.match.pinnedIds ?? [], action.payload.map(item => item.id)),
        },
      }
    }
    case 'SET_MATCH_PANTRY': {
      return {
        ...state,
        match: {
          ...state.match,
          pantry: action.payload,
        },
      }
    }
    case 'SET_MATCH_RESULTS': {
      const { results, queryKey } = action.payload
      return {
        ...state,
        match: {
          ...state.match,
          results,
          queryKey,
          shoppingDishIds: queryKey === state.match.queryKey
            ? (state.match.shoppingDishIds ?? []).filter(id => results?.some(dish => dish.id === id && dish.missing?.length > 0)) : [],
        },
      }
    }
    case 'TOGGLE_MATCH_PIN':
      return { ...state, match: { ...state.match, pinnedIds: togglePinnedIngredient(
        state.match.pinnedIds ?? [], action.payload, state.match.ingredients.map(item => item.id),
      ) } }
    case 'TOGGLE_SHOPPING_DISH': {
      const id = action.payload
      if (!state.match.results?.some(dish => dish.id === id && dish.missing?.length > 0)) return state
      const selected = state.match.shoppingDishIds ?? []
      return { ...state, match: { ...state.match, shoppingDishIds: selected.includes(id)
        ? selected.filter(value => value !== id) : [...selected, id] } }
    }
    case 'CLEAR_SHOPPING_DISHES':
      return { ...state, match: { ...state.match, shoppingDishIds: [] } }
    case 'RESET_ALL':
      return initialSessionState

    default:
      return state
  }
}
