import { MIN_PASSWORD_LENGTH } from '../../lib/config'
import { vi } from '../../i18n/vi'

const t = vi.auth.errors

// Ánh xạ lỗi Supabase Auth sang tiếng Việt. Ưu tiên error.code, dự phòng theo error.message.
// context: 'login' | 'register' (chỉ ảnh hưởng thông báo lỗi chung).
export function mapAuthError(error, context = 'login') {
  const code = error?.code
  const message = String(error?.message ?? '').toLowerCase()
  const status = error?.status

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return t.invalidCredentials
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered') || message.includes('already been registered')) {
    return t.emailTaken
  }
  if (code === 'weak_password' || message.includes('password should be at least') || message.includes('weak password')) {
    return t.weakPassword(MIN_PASSWORD_LENGTH)
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return t.emailNotConfirmed
  if (
    code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || code === 'over_sms_send_rate_limit' ||
    status === 429 || message.includes('rate limit')
  ) {
    return t.rateLimited
  }
  if (code === 'email_address_invalid' || (code === 'validation_failed' && message.includes('email'))) return t.emailInvalid
  if (code === 'signup_disabled' || message.includes('signups not allowed')) return t.signupDisabled
  return context === 'register' ? t.registerFailed : t.loginFailed
}
