import { supabase } from '../supabase'
import { invalidResponseError, networkError, parseApiError } from './errors'

const MOCK_ENABLED = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'

function baseUrl() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

// Bỏ tham số rỗng (undefined, null, '') để không gửi ?q=&page=undefined.
function cleanQuery(query) {
  return Object.fromEntries(Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''))
}

function buildUrl(path, query) {
  const qs = new URLSearchParams(Object.entries(cleanQuery(query)).map(([k, v]) => [k, String(v)])).toString()
  return `${baseUrl()}/api${path}${qs ? `?${qs}` : ''}`
}

// Token luôn đọc từ Supabase (đã tự làm mới), không giữ bản sao.
async function currentSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

function isAbort(error) {
  return error?.name === 'AbortError'
}

async function parseJson(response) {
  if (response.status === 204) return null
  return response.json().catch(() => null)
}

// request(method, path, { query, body, auth, signal, mockable })
//  - auth: true thì gắn Authorization: Bearer <token>; chưa đăng nhập thì ném ApiError 401 mà không gọi mạng.
//  - mockable: true thì khi (DEV và VITE_USE_MOCK === 'true') request đi qua bộ giả lập thay vì mạng.
//    Chỉ dùng cho endpoint chưa có trên backend thật. `dishes.list` và `me` không bao giờ đặt cờ này.
// Trả về phần thân JSON của phản hồi thành công ({ data, meta } theo contract, hoặc dạng cũ của main).
// Ném ApiError cho mọi lỗi; AbortError được ném nguyên vẹn để nơi gọi kiểm tra signal.aborted.
export async function request(method, path, { query, body, auth = false, signal, mockable = false } = {}) {
  const session = auth || mockable ? await currentSession() : null
  if (auth && !session?.access_token) {
    throw parseApiError(401, { error: { code: 'UNAUTHORIZED', message: '' } })
  }

  let status
  let payload
  if (mockable && MOCK_ENABLED) {
    // import() động nằm trong nhánh chỉ có ở DEV để bản build production loại bỏ hoàn toàn code mock.
    const { handleMockRequest } = await import('./mock/server.js')
    const result = await handleMockRequest({
      method, path, query: cleanQuery(query), body, signal,
      session: session ? { userId: session.user?.id, displayName: session.user?.user_metadata?.display_name, authenticated: true } : null,
    })
    status = result.status
    payload = result.body
  } else {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (auth) headers.Authorization = `Bearer ${session.access_token}`
    let response
    try {
      response = await fetch(buildUrl(path, query), {
        method, headers, signal,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch (error) {
      if (isAbort(error) || signal?.aborted) throw error
      throw networkError()
    }
    status = response.status
    payload = await parseJson(response)
    if (response.ok && payload === null && status !== 204) throw invalidResponseError(status)
  }

  if (status < 200 || status >= 300) throw parseApiError(status, payload)
  return payload
}

export const get = (path, options) => request('GET', path, options)
export const post = (path, body, options) => request('POST', path, { ...options, body })
export const put = (path, body, options) => request('PUT', path, { ...options, body })
export const patch = (path, body, options) => request('PATCH', path, { ...options, body })
export const del = (path, options) => request('DELETE', path, options)
