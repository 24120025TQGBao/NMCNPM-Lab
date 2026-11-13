import { post } from '../client'

export const reports = {
  // POST /api/reports body { target_type: 'POST' | 'COMMENT', target_id, reason } (giả định).
  // Báo cáo trùng: ApiError 409.
  async create({ targetType, targetId, reason }, { signal } = {}) {
    await post('/reports', { target_type: targetType, target_id: targetId, reason }, { auth: true, signal, mockable: true })
  },
}
