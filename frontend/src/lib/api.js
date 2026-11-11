import { vi } from '../i18n/vi'

export async function api(path, token, signal) {
  const response = await fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}, signal,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(vi.errors.api(response.status))
    error.status = response.status
    throw error
  }
  if (!body) throw new Error(vi.errors.notJson)
  return body
}
