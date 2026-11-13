import { get, post } from '../client'
import { mapPage, mapReport, unwrap } from '../mappers'

// Toàn bộ là giả định. Backend phải tự kiểm tra quyền quản trị (403 nếu không phải ADMIN).
export const admin = {
  async listReports({ status, page, limit, signal } = {}) {
    return mapPage(await get('/admin/reports', { query: { status, page, limit }, auth: true, signal, mockable: true }), mapReport)
  },
  // POST /api/admin/content/:type/:id/hide body { reason }. type: 'posts' | 'comments'.
  async hideContent({ type, id, reason }, { signal } = {}) {
    const data = unwrap(await post(`/admin/content/${encodeURIComponent(type)}/${encodeURIComponent(id)}/hide`, { reason }, { auth: true, signal, mockable: true }))
    return data ? mapReport(data) : null
  },
}
