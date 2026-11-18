import { get } from '../client'
import { mapDish, mapDishList, unwrap } from '../mappers'

export const dishes = {
  // Luôn gọi API thật (không mockable). Nhận cả mảng thuần (main) lẫn { data, meta } (contract).
  // Trả { data: Dish[], meta }. `search`, `page`, `limit` chưa được backend trên main hỗ trợ (bị bỏ qua).
  async list({ search, page, limit, signal } = {}) {
    const body = await get('/dishes', { query: { search, page, limit }, signal })
    return mapDishList(body)
  },
  // GET /api/dishes/:id (giả định, chưa có trên backend)
  async get(id, { signal } = {}) {
    return mapDish(unwrap(await get(`/dishes/${encodeURIComponent(id)}`, { signal, mockable: true })))
  },
}
