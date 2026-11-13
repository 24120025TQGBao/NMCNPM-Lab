import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from './app.js'

async function withServer(client, run) {
  const server = createApp(client).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try { await run(`http://127.0.0.1:${server.address().port}`) }
  finally { await new Promise(resolve => server.close(resolve)) }
}

test('GET /api/dishes is public and returns the paginated API envelope', async () => {
  const result = {
    data: [{ id: 17, name: 'Phở bò', description: null, image_url: null }],
    total: 1
  }
  const calls = []
  const client = {
    async rpc(name, args) {
      calls.push({ name, args })
      return { data: result, error: null }
    }
  }

  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      data: result.data,
      meta: { page: 1, limit: 20, total: 1 }
    })
  })

  assert.deepEqual(calls, [{
    name: 'search_public_dishes',
    args: { p_search: null, p_page: 1, p_limit: 20 }
  }])
})

test('GET /api/dishes applies search and pagination parameters', async () => {
  const calls = []
  const client = {
    async rpc(name, args) {
      calls.push({ name, args })
      return { data: { data: [], total: 13 }, error: null }
    }
  }

  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes?search=pho&page=2&limit=5`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      data: [],
      meta: { page: 2, limit: 5, total: 13 }
    })
  })

  assert.deepEqual(calls, [{
    name: 'search_public_dishes',
    args: { p_search: 'pho', p_page: 2, p_limit: 5 }
  }])
})

test('invalid pagination parameters return contract validation errors without querying Supabase', async () => {
  let called = false
  const client = {
    async rpc() {
      called = true
      return { data: { data: [], total: 0 }, error: null }
    }
  }

  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes?page=0&limit=51`)
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: [
          { field: 'page', message: 'page phải là số nguyên dương' },
          { field: 'limit', message: 'limit phải từ 1 đến 50' }
        ]
      }
    })
  })

  assert.equal(called, false)
})

test('no matches return 200 with an empty data array and zero total', async () => {
  const client = {
    async rpc() {
      return { data: { data: [], total: 0 }, error: null }
    }
  }

  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes?search=not-found`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      data: [],
      meta: { page: 1, limit: 20, total: 0 }
    })
  })
})

test('legacy search route keeps working with the corrected response envelope', async () => {
  const client = {
    async rpc(name, args) {
      assert.equal(name, 'search_public_dishes')
      assert.equal(args.p_search, 'pho')
      return { data: { data: [], total: 0 }, error: null }
    }
  }

  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes/search?q=pho`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      data: [],
      meta: { page: 1, limit: 20, total: 0 }
    })
  })
})

test('database errors return a generic 500 response without exposing details', async () => {
  const client = {
    async rpc() {
      return { data: null, error: new Error('relation mon_an does not exist') }
    }
  }

  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes`)
    const body = await response.json()
    assert.equal(response.status, 500)
    assert.deepEqual(body, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Lỗi máy chủ'
      }
    })
    assert.equal(JSON.stringify(body).includes('mon_an'), false)
  })
})
