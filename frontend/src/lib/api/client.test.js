import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let session = null
vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session } }) } },
}))

const { request } = await import('./client')
const { dishes } = await import('./services/dishes')
const { me } = await import('./services/me')
const { ApiError } = await import('./errors')

function respond(status, body, { json = true } = {}) {
  return Promise.resolve({
    status, ok: status >= 200 && status < 300,
    json: () => (json ? Promise.resolve(body) : Promise.reject(new SyntaxError('bad json'))),
  })
}

let fetchMock
beforeEach(() => {
  session = null
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('request', () => {
  it('builds the URL under /api, drops empty query params, sends JSON body', async () => {
    fetchMock.mockReturnValue(respond(200, { data: [] }))
    await request('POST', '/posts', { query: { q: '', page: 2, limit: undefined, type: 'RECIPE' }, body: { a: 1 } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/posts?page=2&type=RECIPE')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('attaches the Supabase access token when auth is true', async () => {
    session = { access_token: 'tok-123', user: { id: 'u1' } }
    fetchMock.mockReturnValue(respond(200, { data: {} }))
    await request('GET', '/me', { auth: true })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123')
  })

  it('throws 401 without calling the network when auth is required but there is no session', async () => {
    await expect(request('GET', '/me', { auth: true })).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [400, { error: { code: 'VALIDATION_ERROR', message: 'Sai', details: [{ field: 'title', message: 'ngắn' }] } }, 'VALIDATION_ERROR'],
    [401, { error: { code: 'UNAUTHORIZED', message: 'x' } }, 'UNAUTHORIZED'],
    [404, { error: { code: 'NOT_FOUND', message: 'x' } }, 'NOT_FOUND'],
    [500, { error: { code: 'INTERNAL_ERROR', message: 'x' } }, 'INTERNAL_ERROR'],
  ])('normalizes HTTP %i to ApiError', async (status, body, code) => {
    fetchMock.mockReturnValue(respond(status, body))
    const err = await request('GET', '/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status, code })
  })

  it('normalizes a non-JSON error response', async () => {
    fetchMock.mockReturnValue(respond(502, null, { json: false }))
    await expect(request('GET', '/x')).rejects.toMatchObject({ status: 502, code: 'INTERNAL_ERROR' })
  })

  it('rejects a 200 response that is not JSON', async () => {
    fetchMock.mockReturnValue(respond(200, null, { json: false }))
    await expect(request('GET', '/x')).rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' })
  })

  it('wraps fetch failures as NETWORK_ERROR but rethrows aborts untouched', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(request('GET', '/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
    const abort = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValueOnce(abort)
    await expect(request('GET', '/x')).rejects.toBe(abort)
  })

  it('allows 204 with no body', async () => {
    fetchMock.mockReturnValue(Promise.resolve({ status: 204, ok: true, json: () => Promise.reject(new Error('no body')) }))
    await expect(request('DELETE', '/x')).resolves.toBeNull()
  })
})

describe('dishes.list', () => {
  it('reads the bare array that main returns', async () => {
    fetchMock.mockReturnValue(respond(200, [{ ma_mon: '1', ten_mon: 'Phở bò', mo_ta_ngan: 'ngon' }]))
    const r = await dishes.list()
    expect(r.data).toEqual([{ id: '1', name: 'Phở bò', description: 'ngon', imageUrl: null }])
    expect(r.meta.total).toBe(1)
  })

  it('reads { data, meta } from the contract', async () => {
    fetchMock.mockReturnValue(respond(200, { data: [{ id: '9', name: 'Bánh mì' }], meta: { page: 1, limit: 20, total: 1 } }))
    expect((await dishes.list({ search: 'bánh', page: 1 })).data[0]).toMatchObject({ id: '9', name: 'Bánh mì' })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/dishes?search=b%C3%A1nh&page=1')
  })
})

describe('me.get', () => {
  it('keeps the status codes AuthProvider depends on: 403 blocked, 409 missing profile', async () => {
    session = { access_token: 't', user: { id: 'u' } }
    fetchMock.mockReturnValueOnce(respond(403, { error: 'This account is inactive.' }))
    await expect(me.get()).rejects.toMatchObject({ status: 403 })
    fetchMock.mockReturnValueOnce(respond(409, { error: 'No profile found.' }))
    await expect(me.get()).rejects.toMatchObject({ status: 409 })
    fetchMock.mockReturnValueOnce(respond(502, { error: 'Could not load your profile.' }))
    await expect(me.get()).rejects.toMatchObject({ status: 502 })
  })

  it('returns the raw profile row (DB columns) untouched', async () => {
    session = { access_token: 't', user: { id: 'u' } }
    const row = { ma_nd: 'u', ten_hien_thi: 'A', vai_tro: 'ADMIN', trang_thai: 'ACTIVE' }
    fetchMock.mockReturnValue(respond(200, row))
    await expect(me.get()).resolves.toEqual(row)
  })
})
