import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { ApiError } from '../../lib/api'
import CommunityPage from './CommunityPage'

vi.mock('../../lib/api', async (orig) => ({ ...(await orig()), posts: { list: vi.fn() } }))
const { posts } = await import('../../lib/api')

const mk = (id, extra = {}) => ({
  id, title: `Bài ${id}`, content: '', createdAt: '2026-11-10T03:00:00Z',
  dish: { id: 1, name: 'Phở bò' }, author: { id: 'u1', displayName: 'An' },
  ingredientCount: 0, stepCount: 0, ...extra,
})
const page = (ids, total, extra) => ({ data: ids.map((i) => mk(i, extra)), meta: { page: 1, limit: 20, total } })

function renderFeed(auth = { isAuthenticated: false }) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter><CommunityPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => { posts.list.mockReset() })

describe('CommunityPage', () => {
  it('shows loading then posts, without a save button', async () => {
    posts.list.mockResolvedValue(page([1, 2], 2))
    renderFeed()
    expect(screen.getByText('Đang tải bài viết…')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Bài 1' })).toHaveAttribute('href', '/posts/1')
    expect(screen.getAllByText(/Đăng bởi An/)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /lưu/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Đăng nhập để đăng bài' })).toHaveAttribute('href', '/login?redirectTo=%2F')
  })

  it('shows empty state with first-post hint when signed in', async () => {
    posts.list.mockResolvedValue(page([], 0))
    renderFeed({ isAuthenticated: true })
    expect(await screen.findByText('Chưa có công thức nào')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Đăng bài đầu tiên' })).toHaveAttribute('href', '/posts/new')
  })

  it('shows error with retry that reloads', async () => {
    posts.list.mockRejectedValueOnce(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Máy chủ lỗi' }))
    posts.list.mockResolvedValueOnce(page([1], 1))
    renderFeed()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ lỗi')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('link', { name: 'Bài 1' })).toBeInTheDocument()
  })

  it('appends the next page on "Xem thêm"', async () => {
    posts.list.mockResolvedValueOnce(page([1, 2], 3))
    posts.list.mockResolvedValueOnce(page([3], 3))
    renderFeed()
    await userEvent.click(await screen.findByRole('button', { name: 'Xem thêm' }))
    expect(await screen.findByRole('link', { name: 'Bài 3' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bài 1' })).toBeInTheDocument()
    expect(posts.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, type: 'RECIPE' }))
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).not.toBeInTheDocument()
  })

  it('keeps loaded posts when loading more fails', async () => {
    posts.list.mockResolvedValueOnce(page([1, 2], 3))
    posts.list.mockRejectedValueOnce(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Mất mạng' }))
    renderFeed()
    await userEvent.click(await screen.findByRole('button', { name: 'Xem thêm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất mạng')
    expect(screen.getByRole('link', { name: 'Bài 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bài 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('ignores repeated clicks while loading more', async () => {
    let resolve
    posts.list.mockResolvedValueOnce(page([1], 2))
    posts.list.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderFeed()
    await userEvent.click(await screen.findByRole('button', { name: 'Xem thêm' }))
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).not.toBeInTheDocument()
    expect(posts.list).toHaveBeenCalledTimes(2)
    resolve(page([2], 2))
    expect(await screen.findByRole('link', { name: 'Bài 2' })).toBeInTheDocument()
  })

  it('shows secondary line only when data exists', async () => {
    posts.list.mockResolvedValue({
      data: [
        mk(1, { content: 'Giống tiêu đề' , title: 'Giống tiêu đề' }),
        mk(2, { content: 'Món nước thơm ngon', ingredientCount: 5, stepCount: 3 }),
      ],
      meta: { page: 1, limit: 20, total: 2 },
    })
    renderFeed()
    await screen.findByRole('link', { name: 'Giống tiêu đề' })
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).queryByText(/nguyên liệu/)).not.toBeInTheDocument()
    expect(within(items[0]).getAllByText('Giống tiêu đề')).toHaveLength(1)
    expect(within(items[1]).getByText('Món nước thơm ngon')).toBeInTheDocument()
    expect(within(items[1]).getByText('5 nguyên liệu · 3 bước')).toBeInTheDocument()
  })

  it('aborts the request on unmount', async () => {
    let signal
    posts.list.mockImplementation((opts) => { signal = opts.signal; return new Promise(() => {}) })
    const { unmount } = renderFeed()
    await waitFor(() => expect(signal).toBeDefined())
    unmount()
    expect(signal.aborted).toBe(true)
  })
})
