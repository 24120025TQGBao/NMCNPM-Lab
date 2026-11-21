import { useState, useEffect, useRef, useCallback } from 'react'
import { searchIngredients } from '../../api/ingredientsApi'

export function useIngredientSearch() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const abortControllerRef = useRef(null)
  const debounceTimerRef = useRef(null)

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    setLoading(true)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const results = await searchIngredients({
          search: trimmed,
          limit: 8,
          signal: controller.signal,
        })
        setSuggestions(results || [])
        setHasSearched(true)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setSuggestions([])
          setHasSearched(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 250) // Debounce 250ms (NFR-03)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, clearSuggestions])

  return {
    query,
    setQuery,
    suggestions,
    loading,
    hasSearched,
    clearSuggestions,
  }
}
