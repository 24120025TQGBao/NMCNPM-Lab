import { get } from '../client'
import { mapDish, mapDishList, unwrap } from '../mappers'

export const dishes = {
  // Luôn gọi API thật (không mockable). Nhận cả mảng thuần (main) lẫn { data, meta } (contract).
  // Trả { data: Dish[], meta }. `search`, `page`, `limit` đã được backend hỗ trợ (BE05, api.md v1.0; limit tối đa 50). Cần SUPABASE_SERVICE_ROLE_KEY ở backend.
  async list({ search, page, limit, signal } = {}) {
    const body = await get('/dishes', { query: { search, page, limit }, signal })
    return mapDishList(body)
  },
  // GET /api/dishes/:id (giả định, chưa có trên backend)
  async get(id, { signal } = {}) {
    return mapDish(unwrap(await get(`/dishes/${encodeURIComponent(id)}`, { signal, mockable: true })))
  },
}
