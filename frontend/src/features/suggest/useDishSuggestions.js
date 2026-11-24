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

  // Lấy món mới từ backend hoặc mock.
  // freshSession = true: phiên mới (đổi chip, vùng miền, xóa chọn, bắt đầu lại).
  // Khi đó KHÔNG dùng history cũ từ closure để exclude (QĐ 1.1, FR-15).
  const fetchNewDish = useCallback(
    async ({ random = false, customChips, customRegion, freshSession = false } = {}) => {
      const currentChips = customChips !== undefined ? customChips : chips
      const currentRegion = customRegion !== undefined ? customRegion : region
      const baseHistory = freshSession ? [] : history

      setLoading(true)
      setError(null)
      const currentReqId = ++requestIdRef.current

      try {
        const exclude = baseHistory.map((d) => d.id)
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
          // Phòng thủ: nếu món trả về đã có trong phiên hiện tại thì coi như hết món (FR-13)
          if (baseHistory.some((d) => d.id === newDish.id)) {
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

  // Vào tab lần đầu nếu chưa có history thì tự gọi (FR-10)
  useEffect(() => {
    if (history.length === 0 && !isExhausted && !loading && !error) {
      fetchNewDish()
    }
  }, [history.length, isExhausted, loading, error, fetchNewDish])

  // Gợi ý khác / Bỏ qua (FR-12, FR-14)
  const nextDish = useCallback(
    (isSkip = false) => {
      if (loading) return
      const currentDish = history[index]
      if (isSkip && currentDish) {
        dispatch({ type: 'SKIP_SUGGEST_DISH', payload: currentDish.id })
      }

      if (index < history.length - 1) {
        // Đã có trong lịch sử: chỉ tiến tới thẻ sau, KHÔNG gọi API (FR-14)
        dispatch({ type: 'SET_SUGGEST_INDEX', payload: index + 1 })
      } else {
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

  // Đổi chip hoàn cảnh: phiên mới (FR-15, QĐ 1.1)
  const toggleChip = useCallback(
    (chipId) => {
      const nextChips = chips.includes(chipId)
        ? chips.filter((c) => c !== chipId)
        : [...chips, chipId]

      setIsExhausted(false)
      dispatch({ type: 'SET_SUGGEST_CHIPS', payload: nextChips })
      fetchNewDish({ customChips: nextChips, freshSession: true })
    },
    [chips, dispatch, fetchNewDish]
  )

  // Chọn vùng miền (P1: FR-20): phiên mới
  const selectRegion = useCallback(
    (r) => {
      setIsExhausted(false)
      dispatch({ type: 'SET_SUGGEST_REGION', payload: r })
      fetchNewDish({ customRegion: r, freshSession: true })
    },
    [dispatch, fetchNewDish]
  )

  // Xóa toàn bộ chip: phiên mới
  const clearChips = useCallback(() => {
    setIsExhausted(false)
    dispatch({ type: 'SET_SUGGEST_CHIPS', payload: [] })
    dispatch({ type: 'SET_SUGGEST_REGION', payload: null })
    fetchNewDish({ customChips: [], customRegion: null, freshSession: true })
  }, [dispatch, fetchNewDish])

  // "Hôm nay ăn gì?": chọn ngẫu nhiên, vẫn giữ exclude của phiên hiện tại (FR-16)
  const randomDish = useCallback(() => {
    if (loading) return
    fetchNewDish({ random: true })
  }, [loading, fetchNewDish])

  // Thử lại khi có lỗi: giữ nguyên trạng thái phiên
  const retry = useCallback(() => {
    fetchNewDish()
  }, [fetchNewDish])

  // Bắt đầu lại: xóa lịch sử và lấy món đầu tiên của phiên mới
  const restart = useCallback(() => {
    setIsExhausted(false)
    dispatch({ type: 'RESET_SUGGEST_HISTORY' })
    fetchNewDish({ freshSession: true })
  }, [dispatch, fetchNewDish])

  // "Xem lại các món trước" khi đã hết món: hiện lại thẻ đang xem, không gọi API
  const reviewHistory = useCallback(() => {
    setIsExhausted(false)
  }, [])

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
    reviewHistory,
  }
}