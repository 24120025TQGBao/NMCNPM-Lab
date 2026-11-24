import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../lib/api/client', () => ({ get }))
const suggestion = { ingredient: { id: 56, name: 'Sườn heo' }, unlock_count: 1, dish_ids: [33] }
async function api() { return import('./ingredientEnhancementsApi') }

beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_USE_MOCK_API', 'false'); get.mockReset() })
afterEach(() => vi.unstubAllEnvs())

describe('FE11 public HTTP contract', () => {
  it('uses the shared client and maps BE12 snake_case without recalculating unlocks', async () => {
    get.mockResolvedValue({ data: [suggestion] })
    const signal = new AbortController().signal
    const result = await (await api()).suggestNextIngredients({ ingredients: [5,6], pantry: false, signal })
    expect(get).toHaveBeenCalledWith('/ingredients/suggest-next', { query: { ingredients: '5,6', pantry: 'false' }, signal })
    expect(result).toEqual([{ ingredient: suggestion.ingredient, unlockCount: 1, dishIds: [33] }])
  })
  it('accepts empty data and defaults pantry to true', async () => {
    get.mockResolvedValue({ data: [] })
    expect(await (await api()).suggestNextIngredients({ ingredients: [5] })).toEqual([])
    expect(get.mock.calls[0][1].query.pantry).toBe('true')
  })
  it('does not turn a malformed unlock count into an empty success', async () => {
    get.mockResolvedValue({ data: [{ ...suggestion, unlock_count: 2 }] })
    await expect((await api()).suggestNextIngredients({ ingredients: [5] })).rejects.toThrow()
  })
  it('propagates errors and cancellation to the caller', async () => {
    const error = new DOMException('Aborted', 'AbortError')
    get.mockRejectedValue(error)
    await expect((await api()).suggestNextIngredients({ ingredients: [5] })).rejects.toBe(error)
  })
  it('finds ingredient membership through the existing paginated catalog, not missing[]', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 1 },{ id: 2 }], meta: { total: 3 } })
      .mockResolvedValueOnce({ data: [{ id: 3 }], meta: { total: 3 } })
    const signal = new AbortController().signal
    expect(await (await api()).getDishIdsUsingIngredient(28, { signal })).toEqual([1,2,3])
    expect(get.mock.calls.map(([, args]) => args.query)).toEqual([
      { ingredients: 28, page: 1, limit: 50 }, { ingredients: 28, page: 2, limit: 50 },
    ])
    expect(get.mock.calls[1][1].signal).toBe(signal)
  })
  it('terminates inconsistent pagination instead of looping or claiming pin success', async () => {
    get.mockResolvedValue({ data: [{ id: 1 }], meta: { total: 3 } })
    await expect((await api()).getDishIdsUsingIngredient(28)).rejects.toThrow()
    expect(get).toHaveBeenCalledTimes(2)
  })
  it('rejects malformed catalog results and honors an already cancelled signal', async () => {
    get.mockResolvedValue({ data: [], meta: {} })
    await expect((await api()).getDishIdsUsingIngredient(28)).rejects.toThrow()
    get.mockClear()
    const controller = new AbortController(); controller.abort()
    await expect((await api()).getDishIdsUsingIngredient(28,{ signal: controller.signal })).rejects.toHaveProperty('name','AbortError')
    expect(get).not.toHaveBeenCalled()
  })
  it('keeps mock mode explicit and uses mock-only fixture membership', async () => {
    vi.stubEnv('VITE_USE_MOCK_API','true')
    const mock = await api()
    expect(await mock.getDishIdsUsingIngredient(4)).toEqual([102])
    const result = await mock.suggestNextIngredients({ ingredients: [4], pantry: true })
    expect(result).toEqual([{ ingredient: { id: 2, name: 'Hành lá' }, unlockCount: 1, dishIds: [102] }])
    expect(get).not.toHaveBeenCalled()
  })
})
