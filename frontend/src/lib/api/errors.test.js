import { describe, expect, it } from 'vitest'
import { ApiError, invalidResponseError, networkError, parseApiError } from './errors'
import { vi as t } from '../../i18n/vi'

describe('parseApiError', () => {
  it('reads contract 400 with details into fields and keeps the Vietnamese server message', () => {
    const err = parseApiError(400, { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: [
      { field: 'ingredients[0].quantity', message: 'Định lượng phải là số lớn hơn 0' },
      { field: 'title', message: 'Tiêu đề quá ngắn' },
      { field: 'title', message: 'trùng, bỏ qua' },
      { nope: true },
    ] } })
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.message).toBe('Dữ liệu không hợp lệ')
    expect(err.fields).toEqual({ 'ingredients[0].quantity': 'Định lượng phải là số lớn hơn 0', title: 'Tiêu đề quá ngắn' })
  })

  it('maps 401, 403, 404, 409 to Vietnamese messages by status', () => {
    expect(parseApiError(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }).message).toBe(t.errors.unauthorized)
    expect(parseApiError(403, { error: { code: 'FORBIDDEN', message: 'x' } }).message).toBe(t.errors.forbidden)
    expect(parseApiError(404, { error: { code: 'NOT_FOUND', message: 'x' } }).message).toBe(t.errors.notFound)
    expect(parseApiError(409, { error: { code: 'CONFLICT', message: 'x' } }).code).toBe('CONFLICT')
  })

  it('does not leak the technical 500 message', () => {
    const err = parseApiError(500, { error: { code: 'INTERNAL_ERROR', message: 'SELECT * FROM secret' } })
    expect(err.message).toBe(t.errors.server)
    expect(err.code).toBe('INTERNAL_ERROR')
  })

  it('reads the legacy string error from main without showing the English text', () => {
    const err = parseApiError(403, { error: 'This account is inactive.' })
    expect(err.status).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
    expect(err.message).toBe(t.errors.forbidden)
    expect(err.fields).toEqual({})
    expect(parseApiError(409, { error: 'No profile found.' }).status).toBe(409)
    expect(parseApiError(502, { error: 'Could not load dishes.' }).message).toBe(t.errors.server)
  })

  it('handles a non-JSON body (null)', () => {
    const err = parseApiError(502, null)
    expect(err.status).toBe(502)
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.message).toBe(t.errors.server)
    expect(parseApiError(418, null).message).toBe(t.errors.api(418))
  })

  it('builds network and invalid-response errors', () => {
    expect(networkError()).toMatchObject({ status: 0, code: 'NETWORK_ERROR', message: t.errors.network })
    expect(invalidResponseError(200)).toMatchObject({ status: 200, code: 'INVALID_RESPONSE', message: t.errors.notJson })
  })
})
