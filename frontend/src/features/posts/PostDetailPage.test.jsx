import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import PostDetailPage from './PostDetailPage'

vi.mock('../../lib/api', async (orig) => ({ ...(await orig()), posts: { get: vi.fn() } }))
const { posts } = await import('../../lib/api')

const detail = {
  id: 7, title: 'Phở bò nhà làm', content: 'Nước dùng ninh 6 tiếng.', createdAt: '2026-11-10T03:00:00Z',
  dish: { id: 1, name: 'Phở bò' }, author: { id: 'u1', displayName: 'An' },
  ingredients: [
    { ingredientId: 1, name: 'Xương bò', quantity: 1.5, unit: 'kg', toTaste: false, role: 'PRIMARY' },
    { ingredientId: 2, name: 'Muối', quantity: null, unit: null, toTaste: true, role: 'SECONDARY' },
  ],
  steps: [{ order: 1, content: 'Chần xương' }, { order: 2, content: 'Ninh nước dùng' }, { order: 3, content: 'Trụng bánh phở' }],
}

function renderAt(path = '/posts/7') {
  const router = createMemoryRouter(
    [{ path: '/', element: <p>bảng tin</p> }, { path: '/posts/:id', element: <PostDetailPage /> }],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => { posts.get.mockReset() })

describe('PostDetailPage', () => {
  it('shows loading then the post', async () => {
    posts.get.mockResolvedValue(detail)
    renderAt()
    expect(screen.getByText('Đang tải bài viết…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Phở bò nhà làm' })).toBeInTheDocument()
    expect(posts.get).toHaveBeenCalledWith('7', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(screen.getByText('Nước dùng ninh 6 tiếng.')).toBeInTheDocument()
  })

  it('shows "Tùy khẩu vị" when quantity is null and the number otherwise', async () => {
    posts.get.mockResolvedValue(detail)
    renderAt()
    const rows = await screen.findAllByRole('row')
    expect(within(rows[1]).getByText('1.5')).toBeInTheDocument()
    expect(within(rows[1]).getByText('kg')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Tùy khẩu vị')).toBeInTheDocument()
  })

  it('renders steps in order even if the API returns them shuffled', async () => {
    posts.get.mockResolvedValue({ ...detail, steps: [detail.steps[2], detail.steps[0], detail.steps[1]] })
    renderAt()
    const items = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['Chần xương', 'Ninh nước dùng', 'Trụng bánh phở'])
    expect(screen.getByRole('list').tagName).toBe('OL')
  })

  it('shows "không còn khả dụng" with a way back on 404', async () => {
    posts.get.mockRejectedValue(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' }))
    renderAt()
    expect(await screen.findByText('Bài viết không còn khả dụng')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Về bảng tin' }))
    expect(await screen.findByText('bảng tin')).toBeInTheDocument()
  })

  it('treats 400 (non-integer id) like not found', async () => {
    posts.get.mockRejectedValue(new ApiError({ status: 400, code: 'VALIDATION_ERROR', message: 'id sai' }))
    renderAt('/posts/abc')
    expect(await screen.findByText('Bài viết không còn khả dụng')).toBeInTheDocument()
  })

  it('shows an alert with retry on other errors', async () => {
    posts.get.mockRejectedValueOnce(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Máy chủ lỗi' }))
    posts.get.mockResolvedValueOnce(detail)
    renderAt()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ lỗi')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Phở bò nhà làm' })).toBeInTheDocument()
  })
})
