import { test } from 'node:test'
import assert from 'node:assert/strict'

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test'

const { createApp } = await import('./app.js')

async function withServer(client, run) {
  const server = createApp({ dishesClient: client }).listen(0, '127.0.0.1')
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

test('category, flavor, time and name are combined before pagination', async () => {
  const calls = []
  const client = { async rpc(name, args) {
    calls.push({ name, args })
    return { data: { data: [], total: 0 }, error: null }
  } }
  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes?search=pho&category=MON_NUOC&flavor=CAY&max_cook_time=30&page=2&limit=12`)
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).meta, { page: 2, limit: 12, total: 0 })
  })
  assert.deepEqual(calls, [{ name: 'search_catalog_dishes', args: {
    p_search: 'pho', p_category: 'MON_NUOC', p_tag_codes: [], p_flavor: 'CAY',
    p_max_cook_time: 30, p_ingredient_ids: [], p_page: 2, p_limit: 12
  } }])
})

test('category-only queries use the catalog RPC instead of dropping the filter', async () => {
  const client = { async rpc(name, args) {
    assert.equal(name, 'search_catalog_dishes')
    assert.equal(args.p_category, 'SOUP')
    return { data: { data: [], total: 0 }, error: null }
  } }
  await withServer(client, async url => {
    assert.equal((await fetch(`${url}/api/dishes?category=SOUP`)).status, 200)
  })
})

test('invalid category query returns validation errors without querying the database', async () => {
  const client = { async rpc() { assert.fail('must not query invalid input') } }
  await withServer(client, async url => {
    for (const query of ['category=mon%20nuoc', 'category=A&category=B', `category=${'A'.repeat(101)}`]) {
      const response = await fetch(`${url}/api/dishes?${query}`)
      assert.equal(response.status, 400)
      assert.equal((await response.json()).error.details[0].field, 'category')
    }
  })
})

test('category lookup reads the existing taxonomy, deduplicates codes and ignores other groups', async () => {
  const client = { from(table) {
    assert.equal(table, 'thuoc_tinh_mon')
    return { async select(fields) {
      assert.equal(fields, 'nhom_tt, gia_tri')
      return { data: [
        { nhom_tt: 'Loại món', gia_tri: 'Món nước' },
        { nhom_tt: 'CATEGORY', gia_tri: 'Món nước' },
        { nhom_tt: 'TYPE', gia_tri: 'Soup' },
        { nhom_tt: 'KHAU_VI', gia_tri: 'Cay' },
        { nhom_tt: 'LOAI_MON', gia_tri: null }
      ], error: null }
    } }
  } }
  await withServer(client, async url => {
    const response = await fetch(`${url}/api/dishes/categories`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { data: [
      { code: 'MON_NUOC', name: 'Món nước' }, { code: 'SOUP', name: 'Soup' }
    ] })
  })
})
