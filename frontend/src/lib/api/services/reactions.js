import { put } from '../client'
import { unwrap } from '../mappers'

export const reactions = {
  // PUT /api/posts/:id/reaction body { value: 'like' | 'dislike' | null } (giả định).
  // Trả { myReaction, likeCount, dislikeCount } sau khi cập nhật.
  async set(postId, value, { signal } = {}) {
    const data = unwrap(await put(`/posts/${encodeURIComponent(postId)}/reaction`, { value }, { auth: true, signal, mockable: true }))
    return {
      myReaction: data?.my_reaction === 'like' || data?.my_reaction === 'dislike' ? data.my_reaction : null,
      likeCount: data?.like_count ?? 0,
      dislikeCount: data?.dislike_count ?? 0,
    }
  },
}
