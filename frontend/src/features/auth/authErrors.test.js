import { describe, expect, it } from 'vitest'
import { mapAuthError } from './authErrors'
import { MIN_PASSWORD_LENGTH } from '../../lib/config'
import { vi as text } from '../../i18n/vi'

const e = text.auth.errors

describe('mapAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials' }, e.invalidCredentials],
    [{ message: 'Invalid login credentials' }, e.invalidCredentials],
    [{ code: 'user_already_exists' }, e.emailTaken],
    [{ code: 'email_exists' }, e.emailTaken],
    [{ message: 'User already registered' }, e.emailTaken],
    [{ code: 'weak_password' }, e.weakPassword(MIN_PASSWORD_LENGTH)],
    [{ code: 'email_not_confirmed' }, e.emailNotConfirmed],
    [{ code: 'over_email_send_rate_limit' }, e.rateLimited],
    [{ status: 429, message: 'x' }, e.rateLimited],
    [{ code: 'email_address_invalid' }, e.emailInvalid],
  ])('maps %o', (error, expected) => {
    expect(mapAuthError(error)).toBe(expected)
  })

  it('falls back by context', () => {
    expect(mapAuthError(new Error('boom'), 'login')).toBe(e.loginFailed)
    expect(mapAuthError(undefined, 'register')).toBe(e.registerFailed)
  })
})
