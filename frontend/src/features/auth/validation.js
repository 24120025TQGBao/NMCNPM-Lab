import { MAX_DISPLAY_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '../../lib/config'
import { vi } from '../../i18n/vi'

const t = vi.auth.validation
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Trả về đối tượng { tên_ô: thông_báo }. Rỗng nghĩa là hợp lệ.
export function validateAuth({ mode, name = '', email = '', password = '' }) {
  const errors = {}
  if (mode === 'register') {
    const trimmed = name.trim()
    if (!trimmed) errors.name = t.nameRequired
    else if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) errors.name = t.nameTooLong(MAX_DISPLAY_NAME_LENGTH)
  }
  const mail = email.trim()
  if (!mail) errors.email = t.emailRequired
  else if (!EMAIL_PATTERN.test(mail)) errors.email = t.emailInvalid
  if (!password) errors.password = t.passwordRequired
  else if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = t.passwordShort(MIN_PASSWORD_LENGTH)
  }
  return errors
}
