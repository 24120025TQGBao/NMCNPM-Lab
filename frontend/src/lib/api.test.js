import { test } from 'node:test'
import assert from 'node:assert/strict'
import { api } from './api.js'

test('API sends bearer token and cancellation signal', async t => {
  const signal = new AbortController().signal
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/me')
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.equal(options.signal, signal)
    return Response.json({ ma_nd: 'user-id' })
  })
  assert.deepEqual(await api('/me', 'test-token', signal), { ma_nd: 'user-id' })
})

test('public API accepts empty results without attaching credentials', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.deepEqual(options.headers, {})
    return Response.json([])
  })
  assert.deepEqual(await api('/dishes'), [])
})

test('API preserves server errors and explains non-JSON responses', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Session expired' }, { status: 401 }))
  await assert.rejects(api('/me'), /Session expired/)
  globalThis.fetch = async () => new Response('<html>wrong host</html>')
  await assert.rejects(api('/dishes'), /API did not return JSON/)
  globalThis.fetch = async () => new Response('unavailable', { status: 502 })
  await assert.rejects(api('/dishes'), /API request failed \(502\)/)
})
