export async function api(path, token, signal) {
  const response = await fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}, signal,
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error || `API request failed (${response.status}).`)
  if (!body) throw new Error('API did not return JSON. Check VITE_API_URL and start the backend.')
  return body
}
