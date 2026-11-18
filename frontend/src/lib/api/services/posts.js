import { del, get, patch, post } from '../client'
import { mapPostDetail, mapPostPage, toCreatePostBody, unwrap } from '../mappers'

const id = encodeURIComponent

export const posts = {
  // GET /api/posts?page=&limit=  (contract). `type` và `q` là giả định, backend thật sẽ bỏ qua.
  async list({ page, limit, type, q, signal } = {}) {
    return mapPostPage(await get('/posts', { query: { page, limit, type, q }, signal, mockable: true }))
  },
  // GET /api/posts/:id. Bài không tồn tại/bị ẩn/bị xóa: ApiError 404.
  async get(postId, { signal } = {}) {
    return mapPostDetail(unwrap(await get(`/posts/${id(postId)}`, { signal, mockable: true })))
  },
  // POST /api/posts (cần đăng nhập). input: { dishId, title, content?, ingredients[{ingredientId|name, quantity, unit, toTaste}], steps[{content}], status? }
  async create(input, { signal } = {}) {
    return mapPostDetail(unwrap(await post('/posts', toCreatePostBody(input), { auth: true, signal, mockable: true })))
  },
  // PATCH /api/posts/:id (giả định)
  async update(postId, input, { signal } = {}) {
    return mapPostDetail(unwrap(await patch(`/posts/${id(postId)}`, toCreatePostBody(input), { auth: true, signal, mockable: true })))
  },
  // DELETE /api/posts/:id (giả định)
  async remove(postId, { signal } = {}) {
    await del(`/posts/${id(postId)}`, { auth: true, signal, mockable: true })
  },
  // GET /api/me/drafts (giả định)
  async listDrafts({ page, limit, signal } = {}) {
    return mapPostPage(await get('/me/drafts', { query: { page, limit }, auth: true, signal, mockable: true }))
  },
}
