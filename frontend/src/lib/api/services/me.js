import { get } from '../client'

export const me = {
  // Luôn gọi API thật (không mockable). Trả nguyên hồ sơ như backend (cột DB: ten_hien_thi, vai_tro, trang_thai...)
  // vì useAuth/UserMenu/RequireRole đang đọc trực tiếp các cột này. ApiError.status: 403 = khóa, 409 = thiếu hồ sơ.
  async get({ signal } = {}) {
    return get('/me', { auth: true, signal })
  },
}
