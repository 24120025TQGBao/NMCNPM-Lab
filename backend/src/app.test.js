import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from './app.js'

async function withServer(client, run) {
  const server = createApp(client).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try { await run(`http://127.0.0.1:${server.address().port}`) }
  finally { await new Promise(resolve => server.close(resolve)) }
}
test('health stays available without credentials; database routes fail clearly', async () => {
  await withServer(null, async url => {
    const health = await fetch(`${url}/api/health`)
    assert.deepEqual(await health.json(), { status: 'ok', databaseConfigured: false })
    assert.equal((await fetch(`${url}/api/dishes`)).status, 503)
  })
})
test('profile rejects missing and invalid tokens before querying profiles', async () => {
  const client = { auth: { getUser: async () => ({ data: {}, error: new Error('invalid') }) }, from() { throw new Error('must not query') } }
  await withServer(client, async url => {
    assert.equal((await fetch(`${url}/api/me`)).status, 401)
    assert.equal((await fetch(`${url}/api/me`, { headers: { Authorization: 'Bearer invalid' } })).status, 401)
  })
})
test('profile uses verified identity and blocks inactive accounts', async () => {
  let status = 'ACTIVE'
  const client = {
    auth: { getUser: async token => { assert.equal(token, 'verified'); return { data: { user: { id: 'trusted-id' } } } } },
    from(table) { assert.equal(table, 'nguoi_dung'); return { select() { return this }, eq(column, id) {
      assert.equal(column, 'ma_nd'); assert.equal(id, 'trusted-id'); return this
    }, async maybeSingle() { return { data: { ma_nd: 'trusted-id', trang_thai: status } } } } },
  }
  await withServer(client, async url => {
    const options = { headers: { Authorization: 'Bearer verified' } }
    assert.equal((await fetch(`${url}/api/me`, options)).status, 200)
    status = 'BANNED'
    assert.equal((await fetch(`${url}/api/me`, options)).status, 403)
  })
})
