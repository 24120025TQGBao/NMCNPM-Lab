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
        },
      }
    }
    case 'RESET_ALL':
      return initialSessionState

    default:
      return state
  }
}
