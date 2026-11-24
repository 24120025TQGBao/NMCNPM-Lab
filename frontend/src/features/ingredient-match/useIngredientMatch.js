import { useState, useCallback, useMemo, useRef } from 'react'
import { matchDishes } from '../../api/dishMatchApi'
import { useSuggestSession } from '../suggest/SuggestSessionContext'
import { groupMatchResults } from './groupMatchResults'

export function useIngredientMatch() {
  const { state, dispatch } = useSuggestSession()
  const { ingredients, pantry, results, queryKey } = state.match

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  // Nhóm kết quả đã có sẵn trong state
  const groupedResults = useMemo(() => {
    return results ? groupMatchResults(results) : null
  }, [results])

  // Thêm nguyên liệu (tối đa 20, không trùng lặp)
  const addIngredient = useCallback(
    (ingredient) => {
      if (ingredients.length >= 20) {
        return { success: false, reason: 'MAX_LIMIT' }
      }
      if (ingredients.some((i) => i.id === ingredient.id)) {
        return { success: false, reason: 'DUPLICATE' }
      }

      const next = [...ingredients, ingredient]
      dispatch({ type: 'SET_MATCH_INGREDIENTS', payload: next })
      return { success: true }
    },
    [ingredients, dispatch]
  )

  // Xóa nguyên liệu
  const removeIngredient = useCallback(
    (id) => {
      const next = ingredients.filter((i) => i.id !== id)
      dispatch({ type: 'SET_MATCH_INGREDIENTS', payload: next })
    },
    [ingredients, dispatch]
  )

  // Xóa toàn bộ nguyên liệu
  const clearAllIngredients = useCallback(() => {
    dispatch({ type: 'SET_MATCH_INGREDIENTS', payload: [] })
    dispatch({ type: 'SET_MATCH_RESULTS', payload: { results: null, queryKey: null } })
  }, [dispatch])

  // Tìm món
  const findDishes = useCallback(
    async (overridePantry) => {
      if (ingredients.length === 0) {
        return { success: false, reason: 'EMPTY_INGREDIENTS' }
      }

      const currentPantry = overridePantry !== undefined ? overridePantry : pantry
      const sortedIds = ingredients.map((i) => i.id).sort((a, b) => a - b)
      const currentQueryKey = `${sortedIds.join(',')}|${currentPantry}`

      // Nếu người dùng bấm tìm lại với đúng queryKey đang có kết quả thì không cần gọi lại (Mục 5.6)
      if (results && queryKey === currentQueryKey && overridePantry === undefined) {
        return { success: true }
      }

      setLoading(true)
      setError(null)

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const data = await matchDishes({
          ingredients: sortedIds,
          pantry: currentPantry,
          signal: controller.signal,
        })

        if (!controller.signal.aborted) {
          dispatch({
            type: 'SET_MATCH_RESULTS',
            payload: { results: data, queryKey: currentQueryKey },
          })
          setLoading(false)
          return { success: true }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err?.message || 'Không tìm được món lúc này. Vui lòng thử lại.')
          setLoading(false)
          return { success: false, error: err }
        }
      }
    },
    [ingredients, pantry, results, queryKey, dispatch]
  )

  // Đổi trạng thái tủ bếp cơ bản (FR-32)
  const togglePantry = useCallback(
    (checked) => {
      dispatch({ type: 'SET_MATCH_PANTRY', payload: checked })
      // Nếu đã có kết quả trước đó, tự tìm lại với pantry mới
      if (results && ingredients.length > 0) {
        findDishes(checked)
      }
    },
    [results, ingredients.length, dispatch, findDishes]
  )

  return {
    ingredients,
    pantry,
    results,
    groupedResults,
    queryKey,
    loading,
    error,
    addIngredient,
    removeIngredient,
    clearAllIngredients,
    findDishes,
    togglePantry,
  }
}
