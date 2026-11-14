import { beforeEach, describe, expect, it } from 'vitest'
import { configureMock, failNext, handleMockRequest, resetMock } from './server'

const alice = { authenticated: true, userId: 'user-alice', displayName: 'Alice' }
const bob = { authenticated: true, userId: 'user-bob', displayName: 'Bob' }
const call = (method, path, extra = {}) => handleMockRequest({ method, path, ...extra })

const validBody = {
  dish_id: 99, title: 'Món thử nghiệm',
  ingredients: [{ name: 'muối', quantity: null, unit: null }, { name: 'đường', quantity: 2, unit: 'muỗng' }],
  steps: [{ content: 'Bước một' }, { content: 'Bước hai' }],
}

beforeEach(() => { resetMock(); configureMock({ latencyMs: 0 }) })

describe('mock server follows the real contract shape', () => {
  it('lists recipe posts newest first as { data, meta } in snake_case, without hidden posts', async () => {
    const { status, body } = await call('GET', '/posts', { query: { limit: 50 } })
    expect(status).toBe(200)
    expect(body.meta).toMatchObject({ page: 1, limit: 50 })
    const dates = body.data.map((p) => p.created_at)
    expect(dates).toEqual([...dates].sort().reverse())
    // Đúng contract GET /api/posts: chỉ có id, title, created_at, dish, author.
    for (const item of body.data) expect(Object.keys(item).sort()).toEqual(['author', 'created_at', 'dish', 'id', 'title'])
    expect(body.data.every((p) => Number.isInteger(p.id) && Number.isInteger(p.dish.id))).toBe(true)
    expect(typeof body.data[0].author.id).toBe('string')
    expect(body.data.some((p) => p.title.includes('đã bị ẩn'))).toBe(false)
    expect(body.data[0]).toHaveProperty('dish.name')
    expect(body.data[0]).toHaveProperty('author.display_name')
    expect(JSON.stringify(body)).not.toMatch(/email/i)
  })

  it('has about 8 recipe posts (one hidden) and 4 review posts', async () => {
    const recipes = await call('GET', '/posts', { query: { limit: 50 } })
    const reviews = await call('GET', '/posts', { query: { type: 'REVIEW', limit: 50 } })
    expect(recipes.body.data).toHaveLength(7)
    expect(reviews.body.data).toHaveLength(4)
    expect(reviews.body.data[0].restaurant).toHaveProperty('name')
  })

  it('returns 404 NOT_FOUND for a hidden post and an unknown post', async () => {
    const hidden = await call('GET', '/posts/8')
    expect(hidden.status).toBe(404)
    expect(hidden.body.error.code).toBe('NOT_FOUND')
    expect((await call('GET', '/posts/999999')).status).toBe(404)
    // Contract: id không phải số nguyên dương -> 400 VALIDATION_ERROR
    expect((await call('GET', '/posts/nope')).status).toBe(400)
  })

  it('rejects bad pagination with VALIDATION_ERROR details', async () => {
    const { status, body } = await call('GET', '/posts', { query: { limit: 51, page: 0 } })
    expect(status).toBe(400)
    expect(body.error.details.map((d) => d.field).sort()).toEqual(['limit', 'page'])
  })

  it('returns 404 for unknown endpoints in the error envelope', async () => {
    const { status, body } = await call('GET', '/nothing')
    expect(status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('create post', () => {
  it('requires a session', async () => {
    expect((await call('POST', '/posts', { body: validBody })).status).toBe(401)
  })

  it('validates like api.md with field paths in details', async () => {
    const { status, body } = await call('POST', '/posts', {
      session: alice,
      body: { dish_id: 'x', title: 'ab', ingredients: [{ name: 'x', quantity: -1 }, {}], steps: [{ content: '  ' }] },
    })
    expect(status).toBe(400)
    const fields = body.error.details.map((d) => d.field)
    expect(fields).toEqual(expect.arrayContaining(['dish_id', 'title', 'ingredients[0].quantity', 'ingredients[1].name', 'steps[0].content']))
  })

  it('rejects string ids like the real backend (dish_id must be an integer)', async () => {
    const { status, body } = await call('POST', '/posts', { session: alice, body: { ...validBody, dish_id: '17' } })
    expect(status).toBe(400)
    expect(body.error.details.map((d) => d.field)).toContain('dish_id')
  })

  it('uses the title as content when content is omitted and returns roles on ingredients', async () => {
    const { body } = await call('POST', '/posts', { session: alice, body: validBody })
    expect(body.data.content).toBe(validBody.title)
    expect(body.data.ingredients.every((i) => i.role === 'PRIMARY' || i.role === 'SECONDARY')).toBe(true)
  })

  it('creates a post that shows first in the feed with ordered steps and null quantity kept', async () => {
    const created = await call('POST', '/posts', { session: alice, body: validBody })
    expect(created.status).toBe(201)
    expect(created.body.data.author).toEqual({ id: 'user-alice', display_name: 'Alice' })
    expect(created.body.data.steps.map((s) => s.order)).toEqual([1, 2])
    expect(created.body.data.ingredients[0].quantity).toBeNull()

    const list = await call('GET', '/posts', { query: {} })
    expect(list.body.data[0].id).toBe(created.body.data.id)
    const detail = await call('GET', `/posts/${created.body.data.id}`)
    expect(detail.body.data.ingredients).toHaveLength(2)
  })

  it('keeps drafts out of the feed and visible only to the owner', async () => {
    const draft = await call('POST', '/posts', { session: alice, body: { ...validBody, status: 'DRAFT' } })
    const id = draft.body.data.id
    expect((await call('GET', '/posts', { query: {} })).body.data.some((p) => p.id === id)).toBe(false)
    expect((await call('GET', `/posts/${id}`, { session: bob })).status).toBe(404)
    expect((await call('GET', `/posts/${id}`, { session: alice })).status).toBe(200)
    expect((await call('GET', '/me/drafts', { session: alice })).body.data.map((p) => p.id)).toEqual([id])
    expect((await call('GET', '/me/drafts', { session: bob })).body.data).toEqual([])
  })

  it('lets only the author edit or delete', async () => {
    const id = (await call('POST', '/posts', { session: alice, body: validBody })).body.data.id
    expect((await call('PATCH', `/posts/${id}`, { session: bob, body: { title: 'Hack' } })).status).toBe(403)
    expect((await call('DELETE', `/posts/${id}`, { session: bob })).status).toBe(403)
    expect((await call('PATCH', `/posts/${id}`, { session: alice, body: { title: 'Tiêu đề mới' } })).body.data.title).toBe('Tiêu đề mới')
    expect((await call('DELETE', `/posts/${id}`, { session: alice })).status).toBe(204)
    expect((await call('GET', `/posts/${id}`)).status).toBe(404)
  })
})

describe('reactions, comments, reports', () => {
  const postId = 1

  it('sets, switches and clears a reaction with updated counts', async () => {
    const before = (await call('GET', `/posts/${postId}`)).body.data
    const liked = (await call('PUT', `/posts/${postId}/reaction`, { session: alice, body: { value: 'like' } })).body.data
    expect(liked).toMatchObject({ my_reaction: 'like', like_count: before.like_count + 1 })
    const switched = (await call('PUT', `/posts/${postId}/reaction`, { session: alice, body: { value: 'dislike' } })).body.data
    expect(switched).toMatchObject({ my_reaction: 'dislike', like_count: before.like_count, dislike_count: before.dislike_count + 1 })
    const cleared = (await call('PUT', `/posts/${postId}/reaction`, { session: alice, body: { value: null } })).body.data
    expect(cleared).toMatchObject({ my_reaction: null, dislike_count: before.dislike_count })
    expect((await call('PUT', `/posts/${postId}/reaction`, { session: alice, body: { value: 'love' } })).status).toBe(400)
    expect((await call('PUT', `/posts/${postId}/reaction`, { body: { value: 'like' } })).status).toBe(401)
  })

  it('rejects blank comments, marks edited ones, and only lets the author change them', async () => {
    expect((await call('POST', `/posts/${postId}/comments`, { session: alice, body: { content: '   ' } })).status).toBe(400)
    const c = (await call('POST', `/posts/${postId}/comments`, { session: alice, body: { content: 'Hay quá' } })).body.data
    expect(c.edited_at).toBeNull()
    expect((await call('PATCH', `/comments/${c.id}`, { session: bob, body: { content: 'x' } })).status).toBe(403)
    const edited = (await call('PATCH', `/comments/${c.id}`, { session: alice, body: { content: 'Rất hay' } })).body.data
    expect(edited.edited_at).not.toBeNull()
    expect((await call('DELETE', `/comments/${c.id}`, { session: bob })).status).toBe(403)
    expect((await call('DELETE', `/comments/${c.id}`, { session: alice })).status).toBe(204)
    const list = (await call('GET', `/posts/${postId}/comments`, { query: {} })).body
    expect(list.data.some((x) => x.id === c.id)).toBe(false)
  })

  it('returns 409 for a duplicate report by the same user', async () => {
    const report = { target_type: 'POST', target_id: postId, reason: 'Spam' }
    expect((await call('POST', '/reports', { session: alice, body: report })).status).toBe(201)
    const dup = await call('POST', '/reports', { session: alice, body: report })
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('CONFLICT')
    expect((await call('POST', '/reports', { session: bob, body: report })).status).toBe(201)
  })

  it('hiding content resolves its reports and removes the post from feed and detail, but admin still sees an excerpt', async () => {
    const target = 7
    const hidden = await call('POST', `/admin/content/posts/${target}/hide`, { session: alice, body: { reason: '' } })
    expect(hidden.status).toBe(400)
    const done = await call('POST', `/admin/content/posts/${target}/hide`, { session: alice, body: { reason: 'Sai công thức' } })
    expect(done.status).toBe(200)
    expect(done.body.data).toMatchObject({ status: 'RESOLVED', resolution: { reason: 'Sai công thức' } })
    expect(done.body.data.excerpt).toContain('Cơm tấm')
    expect((await call('GET', `/posts/${target}`)).status).toBe(404)
    expect((await call('GET', '/posts', { query: { limit: 50 } })).body.data.some((p) => p.id === target)).toBe(false)
    const pending = await call('GET', '/admin/reports', { session: alice, query: { status: 'PENDING' } })
    expect(pending.body.data.some((r) => r.target_id === target)).toBe(false)
  })
})

describe('recipes and failure simulation', () => {
  it('lists recipes per dish, empty for a dish without recipes, 404 for unknown dish', async () => {
    const pho = await call('GET', '/dishes/101/recipes')
    expect(pho.body.data).toHaveLength(2)
    const bunThit = await call('GET', '/dishes/105/recipes')
    expect(bunThit).toMatchObject({ status: 200, body: { data: [] } })
    expect((await call('GET', '/dishes/999/recipes')).status).toBe(404)
    expect((await call('GET', '/dishes/unknown/recipes')).status).toBe(400)
  })

  it('flags an incomplete recipe', async () => {
    const r = await call('GET', '/recipes/505')
    expect(r.body.data).toMatchObject({ incomplete: true, steps: [] })
  })

  it.each([400, 401, 403, 404, 409, 500])('failNext(%i) returns that error once', async (status) => {
    failNext(status)
    const r = await call('GET', '/posts')
    expect(r.status).toBe(status)
    expect(r.body.error).toHaveProperty('code')
    expect((await call('GET', '/posts')).status).toBe(200)
  })

  it('returns data that callers cannot use to mutate stored state', async () => {
    const first = await call('GET', '/posts/1')
    first.body.data.title = 'bị sửa'
    expect((await call('GET', '/posts/1')).body.data.title).not.toBe('bị sửa')
  })
})
