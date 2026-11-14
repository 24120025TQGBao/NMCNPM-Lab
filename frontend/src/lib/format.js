const formatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

// Định dạng thời gian đăng theo tiếng Việt; trả null nếu thiếu hoặc không hợp lệ.
export function formatDateTime(iso) {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : formatter.format(date)
}
