import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import { posts as postsApi } from '../../lib/api'
import { PAGE_SIZE } from '../../lib/config'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { PostCard } from '../posts/PostCard'
import { useAuth } from '../auth/useAuth'
import { vi } from '../../i18n/vi'

// Bảng tin Cộng đồng (FE04): chỉ bài công thức. Tab, tìm kiếm, tương tác thuộc FE07.
export default function CommunityPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [reload, setReload] = useState(0)
  const moreController = useRef(null)
  const busy = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    postsApi.list({ page: 1, limit: PAGE_SIZE, type: 'RECIPE', signal: controller.signal })
      .then((result) => {
        setItems(result.data)
        setTotal(result.meta.total)
        setPage(1)
        setStatus('ready')
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err.message || vi.errors.generic)
        setStatus('error')
      })
    return () => {
      controller.abort()
      moreController.current?.abort()
      busy.current = false
    }
  }, [reload])

  const retry = () => {
    setStatus('loading')
    setError('')
    setMoreError('')
    setLoadingMore(false)
    setReload((n) => n + 1)
  }

  const loadMore = useCallback(() => {
    if (busy.current) return
    busy.current = true
    setLoadingMore(true)
    setMoreError('')
    const controller = new AbortController()
    moreController.current = controller
    const next = page + 1
    postsApi.list({ page: next, limit: PAGE_SIZE, type: 'RECIPE', signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        // Loại trùng id phòng khi có bài mới làm lệch các trang.
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id))
          return [...prev, ...result.data.filter((p) => !seen.has(p.id))]
        })
        setTotal(result.meta.total)
        setPage(next)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setMoreError(err.message || vi.community.loadMoreFailed)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        busy.current = false
        setLoadingMore(false)
      })
  }, [page])

  const action = isAuthenticated ? (
    <Button to="/posts/new">
      <PenSquare aria-hidden="true" size={18} strokeWidth={1.5} />
      {vi.community.newPost}
    </Button>
  ) : (
    <Button to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`} variant="secondary">
      {vi.community.loginToPost}
    </Button>
  )

  let content
  if (status === 'loading') content = <Spinner label={vi.community.loading} />
  else if (status === 'error') {
    content = (
      <div className="space-y-3">
        <Alert tone="error">{error}</Alert>
        <Button variant="secondary" onClick={retry}>{vi.community.retry}</Button>
      </div>
    )
  } else if (!items.length) {
    content = (
      <EmptyState
        title={vi.community.emptyTitle}
        action={isAuthenticated ? <Button to="/posts/new">{vi.community.firstPost}</Button> : undefined}
      >
        {isAuthenticated ? vi.community.emptyMember : vi.community.emptyGuest}
      </EmptyState>
    )
  } else {
    // Còn trang kế khi đã tải ít hơn tổng số bài.
    const hasMore = items.length < total
    content = (
      <>
        <ul aria-label={vi.community.feedLabel} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => <PostCard key={post.id} post={post} />)}
        </ul>
        <div className="mt-6 space-y-3">
          {moreError && <Alert tone="error">{moreError}</Alert>}
          {loadingMore && <Spinner label={vi.community.loadingMore} />}
          {hasMore && !loadingMore && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={loadMore}>
                {moreError ? vi.community.retry : vi.community.loadMore}
              </Button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title={vi.community.title} subtitle={vi.community.subtitle} />
      <div className="mb-6">{action}</div>
      {content}
    </>
  )
}
