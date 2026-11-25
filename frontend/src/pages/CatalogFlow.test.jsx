import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchPage from './SearchPage'
import DishDetailPage from './DishDetailPage'
import DishRecipesPage from './DishRecipesPage'
import RecipeDetailPage from './RecipeDetailPage'
import { get } from '../lib/api/client'
import { configureMock, handleMockRequest, resetMock } from '../lib/api/mock/server'
import { parseApiError } from '../lib/api/errors'

vi.mock('../lib/supabase', () => ({ supabase: null }))
vi.mock('../lib/api/client', async (original) => ({ ...await original(), get: vi.fn() }))

async function mockGet(path, { query, signal } = {}) {
  const cleanQuery = Object.fromEntries(Object.entries(query ?? {}).filter(([, value]) => value !== '' && value !== undefined && value !== null))
  const result = await handleMockRequest({ method: 'GET', path, query: cleanQuery, signal })
  if (result.status >= 400) throw parseApiError(result.status, result.body)
  return result.body
}

function open(entry = '/search') {
  const router = createMemoryRouter([
    { path: '/search', element: <SearchPage /> },
    { path: '/goi-y', element: <div>Gợi ý món giữ trạng thái</div> },
    { path: '/dishes/:id', element: <DishDetailPage /> },
    { path: '/dishes/:id/recipes', element: <DishRecipesPage /> },
    { path: '/recipes/:id', element: <RecipeDetailPage /> },
  ], { initialEntries: [entry] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  resetMock()
  configureMock({ latencyMs: 0 })
  get.mockReset().mockImplementation(mockGet)
})

describe('S2-03 / S2-04 catalog flow', () => {
  it('shows cooking time and recipes on the dish and returns to the suggestion source', async () => {
    const user = userEvent.setup()
    get.mockImplementation(async (path, options) => {
      if (path === '/dishes/101') return { data: { id: 101, name: 'Phở bò', cook_time_minutes: 60 } }
      if (path === '/dishes/101/recipes') return { data: [{ id: 501, dish_id: 101, name: 'Phở bò nấu nhanh', servings: null, prep_time_minutes: 45 }], meta: { page: 1, limit: 12, total: 1 } }
      return mockGet(path, options)
    })
    open({ pathname: '/dishes/101', state: { searchReturnTo: '/goi-y?tab=nguyen-lieu' } })
    expect(await screen.findByText('Thời gian nấu: 60 phút')).toBeInTheDocument()
    expect(screen.getByText('Phở bò nấu nhanh')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Quay lại tìm món' }))
    expect(await screen.findByText('Gợi ý món giữ trạng thái')).toBeInTheDocument()
  })

  it('explains on the dish page when there is no recipe', async () => {
    get.mockImplementation(async (path, options) => {
      if (path === '/dishes/101') return { data: { id: 101, name: 'Phở bò' } }
      if (path === '/dishes/101/recipes') return { data: [], meta: { page: 1, limit: 12, total: 0 } }
      return mockGet(path, options)
    })
    open('/dishes/101')
    expect(await screen.findByText('Món này chưa có công thức.')).toBeInTheDocument()
  })
  it('searches without accents, combines filters, opens recipe details and restores the search on return', async () => {
    const user = userEvent.setup()
    const router = open('/search?search=pho&category=MON_NUOC&flavor=THANH&max_cook_time=60')
    expect(await screen.findByText('Tìm thấy 1 món ăn')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Phở bò.*Xem món/ }))
    expect(await screen.findByRole('heading', { name: 'Phở bò', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quán ăn.*Sắp có/ })).toBeDisabled()
    await user.click(screen.getByRole('link', { name: 'Tự nấu' }))
    expect(await screen.findByRole('heading', { name: 'Công thức cho Phở bò' })).toBeInTheDocument()
    const card = screen.getByRole('heading', { name: 'Phở bò nấu nhanh' }).closest('li')
    expect(within(card).getByText('4 người')).toBeInTheDocument()
    expect(within(card).getByText('45 phút')).toBeInTheDocument()
    await user.click(within(card).getByRole('link', { name: 'Xem công thức' }))
    expect(await screen.findByRole('heading', { name: 'Phở bò nấu nhanh', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('200 g')).toBeInTheDocument()
    expect(screen.getByText('1 lít')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /^Bước/ }).map((node) => node.textContent)).toEqual(['Bước 1', 'Bước 2'])
    await user.click(screen.getByRole('link', { name: 'Quay lại danh sách công thức' }))
    await screen.findByRole('heading', { name: 'Công thức cho Phở bò' })
    await user.click(screen.getByRole('link', { name: 'Quay lại tìm món' }))
    await screen.findByText('Tìm thấy 1 món ăn')
    expect(screen.getByRole('searchbox')).toHaveValue('pho')
    expect(screen.getByRole('combobox', { name: 'Loại món' })).toHaveValue('MON_NUOC')
    expect(screen.getByRole('combobox', { name: 'Khẩu vị' })).toHaveValue('THANH')
    expect(screen.getByRole('combobox', { name: 'Thời gian chế biến' })).toHaveValue('60')
    expect(router.state.location.search).toContain('search=pho')
  })

  it('paginates on the server, resets page when a filter changes and preserves page on browser Back', async () => {
    const user = userEvent.setup()
    get.mockImplementation(async (path, options = {}) => {
      if (path !== '/dishes') return mockGet(path, options)
      return { data: [{ id: 101, name: 'Phở bò' }], meta: { page: options.query.page, limit: 12, total: 25 } }
    })
    const router = open('/search?page=2')
    await screen.findByText('Trang 2 / 3')
    await user.click(screen.getByRole('link', { name: /Phở bò.*Xem món/ }))
    await screen.findByRole('heading', { name: 'Phở bò', level: 1 })
    await act(() => router.navigate(-1))
    await screen.findByText('Trang 2 / 3')
    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await screen.findByText('Trang 3 / 3')
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Khẩu vị' }), 'CAY')
    await screen.findByText('Trang 1 / 3')
    expect(get).toHaveBeenCalledWith('/dishes', expect.objectContaining({ query: expect.objectContaining({ page: 1, flavor: 'CAY', limit: 12 }) }))
  })

  it('shows loading, an empty result and clears all filters', async () => {
    const user = userEvent.setup()
    const router = open('/search?search=khong-co-mon&flavor=CAY')
    expect(screen.getByText('Đang tìm món ăn…')).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Không tìm thấy món phù hợp' })
    await user.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' })[0])
    await screen.findByText('Tìm thấy 5 món ăn')
    expect(router.state.location.search).toBe('')
  })

  it('retries a search failure without exposing technical error text', async () => {
    const user = userEvent.setup()
    let failed = false
    get.mockImplementation((path, options) => {
      if (path === '/dishes' && !failed) { failed = true; return Promise.reject(new Error('SQL internal stack')) }
      return mockGet(path, options)
    })
    open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được danh sách món ăn')
    expect(screen.getByRole('alert')).not.toHaveTextContent('SQL')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    await screen.findByText('Tìm thấy 5 món ăn')
  })

  it('ignores a late search response when the keyword has changed', async () => {
    let resolveOld
    get.mockImplementation((path, options) => {
      if (path === '/dishes' && options.query.search === 'old') return new Promise((resolve) => { resolveOld = resolve })
      return mockGet(path, options)
    })
    const router = open('/search?search=old')
    await waitFor(() => expect(resolveOld).toBeTypeOf('function'))
    await act(() => router.navigate('/search?search=pho'))
    await screen.findByText('Tìm thấy 1 món ăn')
    await act(async () => resolveOld({ data: [{ id: 999, name: 'Stale dish' }], meta: { total: 1 } }))
    expect(screen.queryByText('Stale dish')).not.toBeInTheDocument()
  })

  it('distinguishes a missing dish from a dish without recipes', async () => {
    const user = userEvent.setup()
    const router = open('/dishes/9999')
    expect(await screen.findByRole('alert')).toHaveTextContent('Món ăn không còn tồn tại')
    expect(screen.getByRole('link', { name: 'Quay lại tìm món' })).toHaveAttribute('href', '/search')
    await act(() => router.navigate('/dishes/105'))
    await screen.findByRole('heading', { name: 'Bún thịt nướng', level: 1 })
    await user.click(screen.getByRole('link', { name: 'Tự nấu' }))
    await screen.findByRole('heading', { name: 'Món này chưa có công thức' })
  })

  it('keeps the list return link even if recipe loading fails, and allows retry', async () => {
    const user = userEvent.setup()
    get.mockRejectedValueOnce(new Error('Failed to fetch'))
    open({ pathname: '/recipes/501', state: { recipeListTo: '/dishes/101/recipes?page=2', searchReturnTo: '/search?search=pho' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được công thức')
    expect(screen.getByRole('link', { name: 'Quay lại danh sách công thức' })).toHaveAttribute('href', '/dishes/101/recipes?page=2')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    await screen.findByRole('heading', { name: 'Phở bò truyền thống', level: 1 })
  })

  it('shows missing recipe, incomplete steps and missing servings explicitly', async () => {
    const router = open('/recipes/9999')
    expect(await screen.findByRole('alert')).toHaveTextContent('Công thức không còn tồn tại')
    await act(() => router.navigate('/recipes/505'))
    await screen.findByRole('heading', { name: 'Bánh mì trứng', level: 1 })
    expect(screen.getByRole('status')).toHaveTextContent('Công thức chưa đầy đủ thông tin')
    expect(screen.getByText('Chưa cập nhật các bước thực hiện.')).toBeInTheDocument()
    expect(screen.getByText('Chưa cập nhật')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay lại danh sách công thức' })).toHaveAttribute('href', '/dishes/104/recipes')
  })

  it('uses tùy khẩu vị only for null quantities and does not invent a missing unit', async () => {
    get.mockResolvedValueOnce({ data: {
      id: 1, dish_id: 101, name: 'Công thức thử', servings: 2, prep_time_minutes: 10,
      ingredients: [{ name: 'Muối', quantity: null, unit: null }, { name: 'Nước', quantity: 1.5, unit: 'lít' }, { name: 'Thịt', quantity: 200, unit: null }],
      steps: [{ order: 2, content: 'Nấu' }, { order: 1, content: 'Rửa' }],
    } })
    open('/recipes/1')
    await screen.findByRole('heading', { name: 'Công thức thử', level: 1 })
    expect(screen.getAllByText('Tùy khẩu vị')).toHaveLength(1)
    expect(screen.getByText('1,5 lít')).toBeInTheDocument()
    expect(screen.getByText('200 (chưa có đơn vị)')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /^Bước/ }).map((node) => node.textContent)).toEqual(['Bước 1', 'Bước 2'])
  })

  it('allows other searches when category metadata fails and retries it separately', async () => {
    const user = userEvent.setup()
    let failed = false
    get.mockImplementation((path, options) => {
      if (path === '/dishes/categories' && !failed) { failed = true; return Promise.reject(new Error('offline')) }
      return mockGet(path, options)
    })
    open()
    await screen.findByText('Tìm thấy 5 món ăn')
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được loại món')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    await screen.findByRole('option', { name: 'Món nước' })
  })

  it('treats a successful response without recipe data as a load failure', async () => {
    get.mockResolvedValueOnce({ data: null })
    open({ pathname: '/recipes/501', state: { recipeListTo: '/dishes/101/recipes' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được công thức')
    expect(screen.getByRole('link', { name: 'Quay lại danh sách công thức' })).toHaveAttribute('href', '/dishes/101/recipes')
  })
})
