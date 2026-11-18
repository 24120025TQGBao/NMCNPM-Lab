import { vi } from '../../i18n/vi'

// Lỗi chuẩn hóa cho mọi lần gọi API.
// status: mã HTTP (0 = không kết nối được). code: mã của contract (VALIDATION_ERROR...) hoặc mã nội bộ.
// message: tiếng Việt, hiển thị được ngay. fields: { [tên trường]: thông báo } dựng từ details.
export class ApiError extends Error {
  constructor({ status, code, message, fields = {} }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

const CODE_BY_STATUS = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
}

function messageForStatus(status) {
  if (status === 400) return vi.errors.validation
  if (status === 401) return vi.errors.unauthorized
  if (status === 403) return vi.errors.forbidden
  if (status === 404) return vi.errors.notFound
  if (status === 409) return vi.errors.conflict
  if (status >= 500) return vi.errors.server
  return vi.errors.api(status)
}

function fieldsFromDetails(details) {
  const fields = {}
  if (!Array.isArray(details)) return fields
  for (const item of details) {
    if (item && typeof item.field === 'string' && typeof item.message === 'string' && !(item.field in fields)) {
      fields[item.field] = item.message
    }
  }
  return fields
}

// Đọc cả hai dạng lỗi:
//  - contract của TV1: { error: { code, message, details: [{ field, message }] } }
//  - backend trên main: { error: "chuỗi tiếng Anh" } (không hiển thị, chỉ dùng thông báo theo mã HTTP)
// body có thể là null (không phải JSON).
export function parseApiError(status, body) {
  const raw = body && typeof body === 'object' ? body.error : undefined
  if (raw && typeof raw === 'object') {
    const code = typeof raw.code === 'string' ? raw.code : CODE_BY_STATUS[status] ?? 'UNKNOWN_ERROR'
    const fields = fieldsFromDetails(raw.details)
    // Lỗi 400 của contract có message tiếng Việt cụ thể; các mã khác dùng thông báo theo trạng thái
    // để không lộ thông điệp kỹ thuật của máy chủ.
    const message = status === 400 && typeof raw.message === 'string' && raw.message.trim()
      ? raw.message : messageForStatus(status)
    return new ApiError({ status, code, message, fields })
  }
  return new ApiError({ status, code: CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR'), message: messageForStatus(status) })
}

export function networkError() {
  return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: vi.errors.network })
}

// Phản hồi 2xx nhưng không phải JSON (thường do sai VITE_API_URL hoặc backend chưa chạy).
export function invalidResponseError(status) {
  return new ApiError({ status, code: 'INVALID_RESPONSE', message: vi.errors.notJson })
}
