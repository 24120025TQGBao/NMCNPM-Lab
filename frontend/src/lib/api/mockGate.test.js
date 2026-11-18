import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't', user: { id: 'u1', user_metadata: { display_name: 'Tester' } } } } }) } },
}))

let fetchMock
beforeEach(() => {
  vi.resetModules()
  fetchMock = vi.fn(() => Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ data: [], meta: { page: 1, limit: 20, total: 0 } }) }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

async function load() {
  const services = await import('./index')
  const mock = await import('./mock/server')
  mock.configureMock({ latencyMs: 0 })
  return services
}

describe('VITE_USE_MOCK gate (DEV is true under Vitest)', () => {
  it('uses the mock for mockable services when VITE_USE_MOCK is "true", never touching the network', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const { posts } = await load()
    const page = await posts.list({ limit: 50 })
    expect(page.data.length).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('goes to the network for the same service when VITE_USE_MOCK is "false"', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    const { posts } = await load()
    await posts.list()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts')
  })

  it.each(['true', 'false'])('dishes.list and me.get always call the real API (VITE_USE_MOCK=%s)', async (flag) => {
    vi.stubEnv('VITE_USE_MOCK', flag)
    const { dishes, me } = await load()
    await dishes.list()
    await me.get()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/api/dishes', '/api/me'])
  })

  it('treats any value other than the exact string "true" as off', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'TRUE')
    const { posts } = await load()
    await posts.list()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('errors from the mock go through the same ApiError normalization', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const { posts } = await load()
    const err = await posts.get(999999).catch((e) => e)
    expect(err).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('maps validation details from the mock to fields', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    const { posts } = await load()
    const err = await posts.create({ dishId: 1, title: 'x', ingredients: [], steps: [] }).catch((e) => e)
    expect(err.status).toBe(400)
    expect(Object.keys(err.fields)).toEqual(expect.arrayContaining(['title', 'ingredients', 'steps']))
  })
})
