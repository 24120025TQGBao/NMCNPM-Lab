import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SuggestSessionProvider } from './SuggestSessionContext'
import { useDishSuggestions } from './useDishSuggestions'
import { getSuggestions } from '../../api/suggestionsApi'

vi.mock('../../api/suggestionsApi', () => ({ getSuggestions: vi.fn() }))

const DISHES = [
  { id: 1, tags: ['TROI_MUA'] },
  { id: 2, tags: [] },
  { id: 3, tags: ['TROI_MUA', 'AN_NHE'] },
  { id: 4, tags: ['AN_NHE'] },
  { id: 5, tags: ['TROI_MUA'] },
].map((d) => ({
  ...d,
  name: `Món ${d.id}`,
  shortDescription: null,
  imageUrl: null,
  cookTimeMinutes: 10,
  flavor: null,
}))

// Giả lập backend: loại exclude, lọc chip theo AND, trả tối đa `limit` món
function fakeBackend({ exclude = [], the = [], limit = 1 }) {
  const seen = exclude.map(Number)
  return Promise.resolve(
    DISHES.filter((d) => !seen.includes(d.id) && the.every((t) => d.tags.includes(t))).slice(0, limit)
  )
}

const wrapper = ({ children }) => <SuggestSessionProvider>{children}</SuggestSessionProvider>

async function setup() {
  const hook = renderHook(() => useDishSuggestions(), { wrapper })
  await waitFor(() => expect(hook.result.current.currentDish).not.toBeNull())
  return hook.result
}

async function settle(result) {
  await waitFor(() => expect(result.current.loading).toBe(false))
}

const lastCall = () => getSuggestions.mock.calls.at(-1)[0]

describe('useDishSuggestions', () => {
  beforeEach(() => {
    sessionStorage.clear()
    getSuggestions.mockReset()
    getSuggestions.mockImplementation(fakeBackend)
  })

  it('vào tab lần đầu: gọi API đúng 1 lần với limit=1 và exclude rỗng', async () => {
    const result = await setup()
    expect(getSuggestions).toHaveBeenCalledTimes(1)
    expect(lastCall().limit).toBe(1)
    expect(lastCall().exclude).toEqual([])
    expect(result.current.history).toHaveLength(1)
  })

  it('"Gợi ý khác": exclude chứa mọi ID đã xem, không lặp món (FR-13)', async () => {
    const result = await setup()
    for (let i = 0; i < 3; i++) {
      await act(async () => result.current.nextDish(false))
      await settle(result)
    }
    const ids = result.current.history.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(lastCall().exclude).toEqual([1, 2, 3])
  })

  it('lùi/tiến trong lịch sử không gọi API (FR-14)', async () => {
    const result = await setup()
    await act(async () => result.current.nextDish(false))
    await settle(result)
    expect(getSuggestions).toHaveBeenCalledTimes(2)

    act(() => result.current.previousDish())
    expect(result.current.index).toBe(0)

    act(() => result.current.nextDish(false))
    expect(result.current.index).toBe(1)
    expect(getSuggestions).toHaveBeenCalledTimes(2)
  })

  it('chọn 2 chip: gửi đủ cả hai (AND) và bắt đầu phiên mới (FR-15)', async () => {
    const result = await setup()

    await act(async () => result.current.toggleChip('TROI_MUA'))
    await settle(result)
    await act(async () => result.current.toggleChip('AN_NHE'))
    await settle(result)

    expect(lastCall().the).toEqual(['TROI_MUA', 'AN_NHE'])
    expect(lastCall().exclude).toEqual([])
    expect(result.current.currentDish.id).toBe(3)
  })

  it('chip làm hết món: báo hết món và KHÔNG tự bỏ chip (QĐ 1.2)', async () => {
    const result = await setup()
    await act(async () => result.current.toggleChip('CUOI_THANG'))
    await settle(result)

    expect(result.current.isExhausted).toBe(true)
    expect(result.current.chips).toEqual(['CUOI_THANG'])
  })

  it('"Hôm nay ăn gì?": random=true, vẫn mang exclude và chip hiện tại (FR-16)', async () => {
    const result = await setup()
    await act(async () => result.current.randomDish())
    await settle(result)

    expect(lastCall().random).toBe(true)
    expect(lastCall().exclude).toEqual([1])
    expect(lastCall().the).toEqual([])
  })

  it('lỗi: giữ nguyên chip và lịch sử, "Thử lại" thành công (FR-17)', async () => {
    const result = await setup()
    getSuggestions.mockRejectedValueOnce(new Error('Mạng lỗi'))

    await act(async () => result.current.nextDish(false))
    await settle(result)
    expect(result.current.error).toBeTruthy()
    expect(result.current.history).toHaveLength(1)

    await act(async () => result.current.retry())
    await settle(result)
    expect(result.current.error).toBeNull()
    expect(result.current.history).toHaveLength(2)
  })

  it('hết món rồi "Bắt đầu lại": exclude rỗng và có món mới (lỗi closure đã sửa)', async () => {
    const result = await setup()
    for (let i = 0; i < 4; i++) {
      await act(async () => result.current.nextDish(false))
      await settle(result)
    }
    await act(async () => result.current.nextDish(false))
    await settle(result)
    expect(result.current.isExhausted).toBe(true)

    await act(async () => result.current.restart())
    await settle(result)
    expect(lastCall().exclude).toEqual([])
    expect(result.current.isExhausted).toBe(false)
    expect(result.current.currentDish).not.toBeNull()
  })

  it('hết món rồi "Xem lại các món trước": hiện lại thẻ cuối, không gọi API', async () => {
    const result = await setup()
    for (let i = 0; i < 5; i++) {
        await act(async () => result.current.nextDish(false))
        await settle(result)
    }
    expect(result.current.isExhausted).toBe(true)

    const callsBefore = getSuggestions.mock.calls.length
    act(() => result.current.reviewHistory())

    expect(result.current.isExhausted).toBe(false)
    expect(result.current.currentDish.id).toBe(5)
    expect(getSuggestions).toHaveBeenCalledTimes(callsBefore)
    })
})