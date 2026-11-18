import { describe, expect, it } from 'vitest'
import { safeRedirect, withRedirect } from './redirect'

describe('safeRedirect', () => {
  it('keeps internal paths', () => expect(safeRedirect('/posts/new?x=1')).toBe('/posts/new?x=1'))
  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'posts', null, undefined])('rejects %s', (v) => {
    expect(safeRedirect(v)).toBe('/')
  })
  it('builds login link', () => {
    expect(withRedirect('/login', '/posts/new')).toBe('/login?redirectTo=%2Fposts%2Fnew')
    expect(withRedirect('/login', '//x')).toBe('/login')
  })
})
