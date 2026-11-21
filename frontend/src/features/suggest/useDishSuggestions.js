import { useState, useEffect, useRef, useCallback } from 'react'
import { getSuggestions } from '../../api/suggestionsApi'
import { useSuggestSession } from './SuggestSessionContext'

export function useDishSuggestions() {
  const { state, dispatch } = useSuggestSession()
  const { chips, region, history, index, skippedIds } = state.suggest

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isExhausted, setIsExhausted] = useState(false)

  // Ref để kiểm soát request mới nhất, tránh race condition (NFR-04)
  const requestIdRef = useRef(0)

  // Fetch món mới từ backend hoặc mock
  const fetchNewDish = useCallback(
    async ({ random = false, _isInitial = false, customChips, customRegion } = {}) => {
      const currentChips = customChips !== undefined ? customChips : chips
      const currentRegion = customRegion !== undefined ? customRegion : region

      setLoading(true)
      setError(null)
      const currentReqId = ++requestIdRef.current

      try {
        const exclude = history.map((d) => d.id)
        const dishes = await getSuggestions({
          exclude,
          the: currentChips,
          random,
          limit: 1,
          vung_mien: currentRegion,
        })

        if (currentReqId !== requestIdRef.current) return

        if (!dishes || dishes.length === 0) {
          setIsExhausted(true)
        } else {
          const newDish = dishes[0]
          // Phòng thủ: nếu món trả về đã có trong history thì coi như hết món (FR-13)
          if (history.some((d) => d.id === newDish.id)) {
            setIsExhausted(true)
          } else {
            setIsExhausted(false)
            dispatch({ type: 'PUSH_SUGGEST_HISTORY', payload: newDish })
          }
        }
      } catch (err) {
        if (currentReqId === requestIdRef.current) {
          setError(err?.message || 'Không thể tải gợi ý món ăn')
        }
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [chips, region, history, dispatch]
  )

  // Vào tab lần đầu nếu chưa có history thì tự gọi (FR-10, Bước 2)
  useEffect(() => {
    if (history.length === 0 && !isExhausted && !loading && !error) {
      fetchNewDish({ isInitial: true })
    }
  }, [history.length, isExhausted, loading, error, fetchNewDish])

  // Chuyển món tiếp theo hoặc gọi món mới (FR-12, FR-14)
  const nextDish = useCallback(
    (isSkip = false) => {
      if (loading) return
      const currentDish = history[index]
      if (isSkip && currentDish) {
        dispatch({ type: 'SKIP_SUGGEST_DISH', payload: currentDish.id })
      }

      if (index < history.length - 1) {
        // Đã có trong lịch sử: chỉ tiến tới thẻ sau mà KHÔNG gọi API (FR-14)
        dispatch({ type: 'SET_SUGGEST_INDEX', payload: index + 1 })
      } else {
        // Đang ở cuối lịch sử: gọi API lấy món mới
        fetchNewDish()
      }
    },
    [index, history, loading, dispatch, fetchNewDish]
  )

  // Xem lại thẻ trước đó trong lịch sử (FR-14)
  const previousDish = useCallback(() => {
    if (loading || index <= 0) return
    setIsExhausted(false)
    dispatch({ type: 'SET_SUGGEST_INDEX', payload: index - 1 })
  }, [index, loading, dispatch])

  // Đổi chip hoàn cảnh (FR-15: coi là phiên mới, xóa history)
  const toggleChip = useCallback(
    (chipId) => {
      const nextChips = chips.includes(chipId)
        ? chips.filter((c) => c !== chipId)
        : [...chips, chipId]

      setIsExhausted(false)
      dispatch({ type: 'SET_SUGGEST_CHIPS', payload: nextChips })
      // Bắt đầu phiên mới ngay
      fetchNewDish({ customChips: nextChips })
    },
    [chips, dispatch, fetchNewDish]
  )

  // Chọn vùng miền (P1: FR-20)
  const selectRegion = useCallback(
    (r) => {
      setIsExhausted(false)
      dispatch({ type: 'SET_SUGGEST_REGION', payload: r })
      fetchNewDish({ customRegion: r })
    },
    [dispatch, fetchNewDish]
  )

  // Xóa toàn bộ chip
  const clearChips = useCallback(() => {
    setIsExhausted(false)
    dispatch({ type: 'SET_SUGGEST_CHIPS', payload: [] })
    dispatch({ type: 'SET_SUGGEST_REGION', payload: null })
    fetchNewDish({ customChips: [], customRegion: null })
  }, [dispatch, fetchNewDish])

  // "Hôm nay ăn gì?" - Chọn ngẫu nhiên (FR-16)
  const randomDish = useCallback(() => {
    if (loading) return
    fetchNewDish({ random: true })
  }, [loading, fetchNewDish])

  // Thử lại khi có lỗi
  const retry = useCallback(() => {
    fetchNewDish()
  }, [fetchNewDish])

  // Bắt đầu lại (xóa lịch sử phiên)
  const restart = useCallback(() => {
    setIsExhausted(false)
    dispatch({ type: 'RESET_SUGGEST_HISTORY' })
    fetchNewDish()
  }, [dispatch, fetchNewDish])

  const currentDish = index >= 0 && index < history.length ? history[index] : null
  const isCurrentSkipped = currentDish ? skippedIds.includes(currentDish.id) : false

  return {
    currentDish,
    isCurrentSkipped,
    chips,
    region,
    history,
    index,
    loading,
    error,
    isExhausted,
    nextDish,
    previousDish,
    toggleChip,
    selectRegion,
    clearChips,
    randomDish,
    retry,
    restart,
  }
}
