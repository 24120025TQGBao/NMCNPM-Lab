import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { posts as postsApi } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Spinner } from '../../components/ui/Spinner'
import { vi } from '../../i18n/vi'

// 404 (không tồn tại, bị ẩn, bị xóa) và 400 (id không phải số nguyên dương) đều hiện như không còn khả dụng.
const isUnavailable = (err) => err?.status === 404 || err?.status === 400

function formatQuantity(ing) {
  if (ing.quantity === null) return vi.post.toTaste
  return String(ing.quantity)
}

export default function PostDetailPage() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading', post: null, error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    postsApi.get(id, { signal: controller.signal })
      .then((post) => setState({ status: 'ready', post, error: '' }))
      .catch((err) => {
        if (controller.signal.aborted) return
        setState({
          status: isUnavailable(err) ? 'unavailable' : 'error',
          post: null,
          error: err.message || vi.errors.generic,
        })
      })
    return () => controller.abort()
  }, [id, reload])

  const retry = () => {
    setState({ status: 'loading', post: null, error: '' })
    setReload((n) => n + 1)
  }

  if (state.status === 'loading') return <Spinner label={vi.post.loading} />
  if (state.status === 'unavailable') {
    return (
      <EmptyState title={vi.post.unavailableTitle} action={<Button to="/">{vi.post.backToFeed}</Button>}>
        {vi.post.unavailableBody}
      </EmptyState>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="space-y-3">
        <Alert tone="error">{state.error}</Alert>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={retry}>{vi.post.retry}</Button>
          <Button to="/" variant="secondary">{vi.post.backToFeed}</Button>
        </div>
      </div>
    )
  }

  const { post } = state
  const when = formatDateTime(post.createdAt)
  const body = post.content.trim() && post.content.trim() !== post.title.trim() ? post.content.trim() : ''
  return (
    <article className="max-w-3xl">
      <Button to="/" variant="secondary" className="mb-6">{vi.post.backToFeed}</Button>
      <h1 className="font-serif text-[32px] leading-[38px] font-semibold break-words md:text-5xl md:leading-[56px]">{post.title}</h1>
      <div aria-hidden="true" className="mt-3 h-[5px] w-16 bg-lemon-gold" />
      {post.dish?.name && <p className="mt-4 font-semibold text-jungle-green">{vi.post.dish(post.dish.name)}</p>}
      <p className="mt-1 text-sm text-ink-muted">
        {post.author?.displayName ? vi.post.byAuthor(post.author.displayName) : vi.post.unknownAuthor}
        {when && <> · <time dateTime={post.createdAt}>{when}</time></>}
      </p>
      {body && <p className="mt-6 break-words whitespace-pre-line">{body}</p>}

      <section aria-labelledby="post-ingredients" className="mt-8">
        <h2 id="post-ingredients" className="font-serif text-2xl font-semibold">{vi.post.ingredients}</h2>
        {post.ingredients.length === 0 ? (
          <p className="mt-2 text-ink-muted">{vi.post.noIngredients}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-card border border-border bg-white">
            <table className="w-full text-left">
              <thead className="bg-surface text-sm text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">{vi.post.ingredientName}</th>
                  <th scope="col" className="px-4 py-2 font-semibold">{vi.post.ingredientQuantity}</th>
                  <th scope="col" className="px-4 py-2 font-semibold">{vi.post.ingredientUnit}</th>
                </tr>
              </thead>
              <tbody>
                {post.ingredients.map((ing, i) => (
                  <tr key={`${ing.ingredientId ?? ing.name}-${i}`} className="border-t border-border">
                    <th scope="row" className="px-4 py-2 font-normal break-words">{ing.name}</th>
                    <td className="px-4 py-2">{formatQuantity(ing)}</td>
                    <td className="px-4 py-2">{ing.quantity === null ? '' : ing.unit ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="post-steps" className="mt-8">
        <h2 id="post-steps" className="font-serif text-2xl font-semibold">{vi.post.steps}</h2>
        {post.steps.length === 0 ? (
          <p className="mt-2 text-ink-muted">{vi.post.noSteps}</p>
        ) : (
          <ol className="mt-3 list-decimal space-y-3 pl-6 marker:font-semibold">
            {[...post.steps].sort((a, b) => a.order - b.order).map((step, i) => (
              <li key={`${step.order}-${i}`} className="pl-1 break-words whitespace-pre-line">{step.content}</li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}
