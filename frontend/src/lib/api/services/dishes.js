import { get } from '../client'
import { mapDish, mapDishList, unwrap } from '../mappers'

export const dishes = {
  // Giữ lookup cũ trên API thật; luồng /search dùng search() để có thể chạy mock độc lập.
  async list({ search, page, limit, signal } = {}) {
    const body = await get('/dishes', { query: { search, page, limit }, signal })
    return mapDishList(body)
  },
  async search({ search, category, flavor, maxCookTime, page, limit, signal } = {}) {
    return mapDishList(await get('/dishes', {
      query: { search, category, flavor, max_cook_time: maxCookTime, page, limit }, signal, mockable: true,
    }))
  },
  async categories({ signal } = {}) {
    const rows = unwrap(await get('/dishes/categories', { signal, mockable: true }))
    if (!Array.isArray(rows)) throw new Error('Không tải được loại món.')
    return rows.filter((row) => typeof row?.code === 'string' && typeof row?.name === 'string')
  },
  async get(id, { signal } = {}) {
    return mapDish(unwrap(await get(`/dishes/${encodeURIComponent(id)}`, { signal, mockable: true })))
  },
}
