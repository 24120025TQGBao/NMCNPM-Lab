import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIngredientSearch } from './useIngredientSearch'
import { searchIngredients } from '../../api/ingredientsApi'

vi.mock('../../api/ingredientsApi', () => ({ searchIngredients: vi.fn() }))

function deferred() {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const tomato = { id: 1, name: 'Cà chua', isBasicPantry: false }
const stale = { id: 99, name: 'Kết quả cũ', isBasicPantry: false }

describe('useIngredientSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    searchIngredients.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounce 250ms: gõ nhanh chỉ gọi API một lần với từ khóa mới nhất', async () => {
    searchIngredients.mockResolvedValue([tomato])
    const { result } = renderHook(() => useIngredientSearch())

    act(() => result.current.setQuery('c'))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    act(() => result.current.setQuery('ca'))
    await act(async () => {
      vi.advanceTimersByTime(100)
    })
    act(() => result.current.setQuery('ca chua'))

    await act(async () => {
      vi.advanceTimersByTime(249)
    })
    expect(searchIngredients).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(searchIngredients).toHaveBeenCalledTimes(1)
    expect(searchIngredients.mock.calls[0][0].search).toBe('ca chua')
  })

  it('hủy request cũ ngay khi gõ tiếp và bỏ qua phản hồi đến muộn', async () => {
    const d1 = deferred()
    const d2 = deferred()
    searchIngredients.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
    const { result } = renderHook(() => useIngredientSearch())

    act(() => result.current.setQuery('ca'))
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    const signal1 = searchIngredients.mock.calls[0][0].signal

    act(() => result.current.setQuery('ca chua'))
    // Request cũ phải bị hủy NGAY, không đợi hết debounce
    expect(signal1.aborted).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    await act(async () => {
      d2.resolve([tomato])
    })
    // Phản hồi cũ đến muộn không được ghi đè
    await act(async () => {
      d1.resolve([stale])
    })

    expect(result.current.suggestions).toEqual([tomato])
  })

  it('từ khóa rỗng thì xóa gợi ý và không gọi API', async () => {
    const { result } = renderHook(() => useIngredientSearch())
    act(() => result.current.setQuery('   '))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(searchIngredients).not.toHaveBeenCalled()
    expect(result.current.suggestions).toEqual([])
  })
})