import { describe, expect, it } from 'vitest'
import { mapDish, mapDishList, mapPostDetail, mapPostPage, mapPostSummary, toCreatePostBody } from './mappers'

describe('mapDish', () => {
  it('maps the DB-column shape returned by main', () => {
    expect(mapDish({ ma_mon: 'a1', ten_mon: 'Phở bò', mo_ta_ngan: 'Mô tả', hinh_anh: 'http://x/y.png' }))
      .toEqual({ id: 'a1', name: 'Phở bò', description: 'Mô tả', imageUrl: 'http://x/y.png' })
  })
  it('maps the contract shape { id, name }', () => {
    expect(mapDish({ id: 7, name: 'Cơm tấm' })).toEqual({ id: 7, name: 'Cơm tấm', description: '', imageUrl: null })
  })
  it('returns null for non-objects', () => {
    expect(mapDish(null)).toBeNull()
  })
})

describe('mapDishList', () => {
  it('accepts a bare array and derives meta', () => {
    const r = mapDishList([{ ma_mon: '1', ten_mon: 'A' }, { ma_mon: '2', ten_mon: 'B' }])
    expect(r.data.map((d) => d.name)).toEqual(['A', 'B'])
    expect(r.meta).toEqual({ page: 1, limit: 2, total: 2 })
  })
  it('accepts { data, meta }', () => {
    const r = mapDishList({ data: [{ id: '1', name: 'A' }], meta: { page: 2, limit: 20, total: 37 } })
    expect(r.data).toHaveLength(1)
    expect(r.meta).toEqual({ page: 2, limit: 20, total: 37 })
  })
  it('treats garbage as empty', () => {
    expect(mapDishList(null)).toEqual({ data: [], meta: { page: 1, limit: 0, total: 0 } })
  })
})

const rawPost = {
  id: 'p1', title: 'Phở', created_at: '2026-11-06T09:30:00.000Z',
  dish: { id: 'd1', name: 'Phở bò' }, author: { id: 'u1', display_name: 'Minh' },
}

describe('post mappers', () => {
  it('maps a contract list item to camelCase with defaults for missing optional fields', () => {
    const p = mapPostSummary(rawPost)
    expect(p).toMatchObject({
      id: 'p1', title: 'Phở', type: 'RECIPE', status: 'PUBLISHED', createdAt: '2026-11-06T09:30:00.000Z',
      dish: { id: 'd1', name: 'Phở bò' }, author: { id: 'u1', displayName: 'Minh' },
      likeCount: 0, commentCount: 0, myReaction: null, ingredientCount: 0, stepCount: 0, restaurant: null,
    })
    expect(p).not.toHaveProperty('email')
  })

  it('maps detail: quantity null means toTaste, steps sorted by order', () => {
    const p = mapPostDetail({
      ...rawPost,
      ingredients: [{ ingredient_id: 'i1', name: 'thịt bò', quantity: 500, unit: 'g' }, { name: 'muối', quantity: null, unit: null }],
      steps: [{ order: 2, content: 'b' }, { order: 1, content: 'a' }],
    })
    expect(p.ingredients[0]).toEqual({ ingredientId: 'i1', name: 'thịt bò', quantity: 500, unit: 'g', toTaste: false })
    expect(p.ingredients[1]).toMatchObject({ name: 'muối', quantity: null, toTaste: true })
    expect(p.steps.map((s) => s.content)).toEqual(['a', 'b'])
    expect(p.ingredientCount).toBe(2)
    expect(p.stepCount).toBe(2)
  })

  it('maps a page with meta', () => {
    const r = mapPostPage({ data: [rawPost], meta: { page: 1, limit: 20, total: 1 } })
    expect(r.data[0].id).toBe('p1')
    expect(r.meta.total).toBe(1)
  })

  it('does not throw on empty or malformed input', () => {
    expect(mapPostDetail(null)).toMatchObject({ id: null, ingredients: [], steps: [] })
    expect(mapPostPage(undefined).data).toEqual([])
  })
})

describe('toCreatePostBody', () => {
  it('builds a snake_case body, null quantity for toTaste, ingredient_id wins over name', () => {
    const body = toCreatePostBody({
      dishId: 'd1', title: 'T', content: 'C',
      ingredients: [
        { name: 'hành', quantity: 1, unit: 'củ' },
        { ingredientId: 'i1', name: 'muối', quantity: 5, toTaste: true },
      ],
      steps: [{ content: 'a' }, 'b'],
    })
    expect(body).toEqual({
      dish_id: 'd1', title: 'T', content: 'C',
      ingredients: [{ name: 'hành', quantity: 1, unit: 'củ' }, { ingredient_id: 'i1', quantity: null, unit: null }],
      steps: [{ content: 'a' }, { content: 'b' }],
    })
  })
})
