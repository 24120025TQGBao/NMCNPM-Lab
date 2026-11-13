import { del, get, patch, post } from '../client'
import { mapComment, mapPage, unwrap } from '../mappers'

const id = encodeURIComponent

// Toàn bộ là giả định (chưa có contract).
export const comments = {
  async list(postId, { page, limit, signal } = {}) {
    return mapPage(await get(`/posts/${id(postId)}/comments`, { query: { page, limit }, signal, mockable: true }), mapComment)
  },
  async create(postId, content, { signal } = {}) {
    return mapComment(unwrap(await post(`/posts/${id(postId)}/comments`, { content }, { auth: true, signal, mockable: true })))
  },
  async update(commentId, content, { signal } = {}) {
    return mapComment(unwrap(await patch(`/comments/${id(commentId)}`, { content }, { auth: true, signal, mockable: true })))
  },
  async remove(commentId, { signal } = {}) {
    await del(`/comments/${id(commentId)}`, { auth: true, signal, mockable: true })
  },
}
