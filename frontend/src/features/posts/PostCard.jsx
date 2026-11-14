import { Link } from 'react-router-dom'
import { formatDateTime } from '../../lib/format'
import { vi } from '../../i18n/vi'

// G16 (cách a): danh sách API chỉ có id, title, createdAt, dish, author. Dòng phụ chỉ hiện khi API có trả.
// G13: thẻ bài cộng đồng không có nút Lưu. Không hiển thị email.
export function PostCard({ post }) {
  const when = formatDateTime(post.createdAt)
  const excerpt = post.content.trim() && post.content.trim() !== post.title.trim() ? post.content.trim() : ''
  const meta = [
    post.ingredientCount > 0 ? vi.post.ingredientCount(post.ingredientCount) : null,
    post.stepCount > 0 ? vi.post.stepCount(post.stepCount) : null,
  ].filter(Boolean)
  return (
    <li className="rounded-card border border-border bg-white p-5 shadow-card">
      <article>
        <h2 className="font-serif text-2xl leading-[30px] font-semibold break-words">
          <Link to={`/posts/${post.id}`} className="hover:underline">{post.title}</Link>
        </h2>
        {post.dish?.name && <p className="mt-1 font-semibold text-jungle-green">{vi.post.dish(post.dish.name)}</p>}
        {excerpt && <p className="mt-2 line-clamp-3 break-words text-ink-muted">{excerpt}</p>}
        {meta.length > 0 && <p className="mt-2 text-sm text-ink-muted">{meta.join(' · ')}</p>}
        <p className="mt-3 text-sm text-ink-muted">
          {post.author?.displayName ? vi.post.byAuthor(post.author.displayName) : vi.post.unknownAuthor}
          {when && <> · <time dateTime={post.createdAt}>{when}</time></>}
        </p>
      </article>
    </li>
  )
}
