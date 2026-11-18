import { describe, expect, it } from 'vitest'
import { validateAuth } from './validation'

describe('validateAuth', () => {
  const ok = { mode: 'register', name: 'Lan', email: 'a@b.co', password: '123456' }
  it('accepts valid register input', () => expect(validateAuth(ok)).toEqual({}))
  it('rejects bad email', () => expect(validateAuth({ ...ok, email: 'abc' }).email).toBeTruthy())
  it('rejects empty email', () => expect(validateAuth({ ...ok, email: '  ' }).email).toBeTruthy())
  it('rejects short password on register only', () => {
    expect(validateAuth({ ...ok, password: '123' }).password).toBeTruthy()
    expect(validateAuth({ mode: 'login', email: 'a@b.co', password: '123' })).toEqual({})
  })
  it('rejects blank or whitespace name', () => {
    expect(validateAuth({ ...ok, name: '   ' }).name).toBeTruthy()
    expect(validateAuth({ ...ok, name: '' }).name).toBeTruthy()
  })
  it('rejects name over 80 chars', () => expect(validateAuth({ ...ok, name: 'a'.repeat(81) }).name).toBeTruthy())
})
