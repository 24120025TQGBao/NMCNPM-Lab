import { useState, useEffect, useCallback } from 'react'
import { searchIngredients } from '../../api/ingredientsApi'

const DEBOUNCE_MS = 250 // NFR-03

export function useIngredientSearch() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setHasSearched(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      setHasSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)

    // Mỗi lần query đổi có một controller riêng; cleanup hủy ngay request cũ (NFR-04)
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const results = await searchIngredients({
          search: trimmed,
          limit: 8,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setSuggestions(results || [])
        setHasSearched(true)
      } catch (err) {
        if (controller.signal.aborted || err?.name === 'AbortError') return
        setSuggestions([])
        setHasSearched(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return {
    query,
    setQuery,
    suggestions,
    loading,
    hasSearched,
    clearSuggestions,
  }
}