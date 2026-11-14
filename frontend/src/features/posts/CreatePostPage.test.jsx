import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { ApiError } from '../../lib/api'
import CreatePostPage from './CreatePostPage'

vi.mock('../../lib/api', async (orig) => ({
  ...(await orig()),
  posts: { create: vi.fn() },
  dishes: { list: vi.fn() },
}))
const { posts, dishes } = await import('../../lib/api')

const signIn = vi.fn()

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>bảng tin</p> },
      { path: '/posts/new', element: <><CreatePostPage /><Link to="/">rời trang</Link></> },
      { path: '/posts/:id', element: <p>chi tiết bài</p> },
    ],
    { initialEntries: ['/posts/new'] },
  )
  render(
    <AuthContext.Provider value={{ status: 'member', isAuthenticated: true, signIn }}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
  return router
}

async function fillValid(user) {
  await screen.findByRole('option', { name: 'Phở bò' })
  await user.selectOptions(screen.getByLabelText('Món ăn'), 'Phở bò')
  await user.type(screen.getByLabelText('Tiêu đề'), 'Phở bò nhà làm')
  await user.type(screen.getByLabelText('Tên nguyên liệu 1'), 'Xương bò')
  await user.type(screen.getByLabelText('Định lượng 1'), '1,5')
  await user.type(screen.getByLabelText('Đơn vị 1'), 'kg')
  await user.type(screen.getByLabelText('Bước 1'), 'Ninh xương')
}

beforeEach(() => {
  posts.create.mockReset()
  signIn.mockReset()
  dishes.list.mockReset()
  dishes.list.mockResolvedValue({ data: [{ id: 3, name: 'Phở bò' }], meta: { page: 1, limit: 20, total: 1 } })
})
afterEach(() => vi.restoreAllMocks())

describe('CreatePostPage', () => {
  it('shows validation errors under the right fields and does not submit', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    expect(posts.create).not.toHaveBeenCalled()
    expect(await screen.findByText('Chọn một món ăn trong danh sách.')).toBeInTheDocument()
    expect(screen.getByText('Tiêu đề cần từ 3 đến 150 ký tự.')).toBeInTheDocument()
    expect(screen.getByText('Nhập tên nguyên liệu.')).toBeInTheDocument()
    expect(screen.getByText('Nhập nội dung bước này.')).toBeInTheDocument()
  })

  it('submits, then goes to the new post with a success flag', async () => {
    const user = userEvent.setup()
    posts.create.mockResolvedValue({ id: 42 })
    const router = renderPage()
    await fillValid(user)
    await user.click(screen.getByLabelText('Tùy khẩu vị, nguyên liệu 1'))
    expect(screen.getByLabelText('Định lượng 1')).toBeDisabled()
    await user.click(screen.getByLabelText('Tùy khẩu vị, nguyên liệu 1'))
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    expect(await screen.findByText('chi tiết bài')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/posts/42')
    expect(router.state.location.state).toEqual({ posted: true })
    expect(posts.create).toHaveBeenCalledWith(
      {
        dishId: 3, title: 'Phở bò nhà làm',
        ingredients: [{ name: 'Xương bò', quantity: 1.5, unit: 'kg', toTaste: false }],
        steps: [{ content: 'Ninh xương' }],
      },
      expect.any(Object),
    )
  })

  it('shows 400 field errors under the matching inputs and keeps the data', async () => {
    const user = userEvent.setup()
    posts.create.mockRejectedValue(new ApiError({
      status: 400, code: 'VALIDATION_ERROR', message: 'sai',
      fields: { 'ingredients[0].quantity': 'Định lượng phải là số lớn hơn 0', title: 'Tiêu đề quá ngắn' },
    }))
    renderPage()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    expect(await screen.findByText('Định lượng phải là số lớn hơn 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Định lượng 1')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Phở bò nhà làm')
    expect(screen.getByLabelText('Bước 1')).toHaveValue('Ninh xương')
  })

  it('shows the backend duplicate-ingredient error (path ingredients[1]) under that row', async () => {
    const user = userEvent.setup()
    posts.create.mockRejectedValue(new ApiError({
      status: 400, code: 'VALIDATION_ERROR', message: 'sai',
      fields: { 'ingredients[1]': 'Nguyên liệu bị trùng trong cùng công thức', foo: 'Trường lạ' },
    }))
    renderPage()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }))
    await user.type(screen.getByLabelText('Tên nguyên liệu 2'), 'Hành')
    await user.type(screen.getByLabelText('Định lượng 2'), '1')
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    expect(await screen.findByText('Nguyên liệu bị trùng trong cùng công thức')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên nguyên liệu 2')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/Trường lạ/)).toBeInTheDocument()
  })

  it('keeps all data and shows an alert on server error', async () => {
    const user = userEvent.setup()
    posts.create.mockRejectedValue(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Máy chủ lỗi' }))
    renderPage()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ lỗi')
    expect(screen.getByLabelText('Tên nguyên liệu 1')).toHaveValue('Xương bò')
    expect(screen.getByRole('button', { name: 'Đăng bài' })).toBeEnabled()
  })

  it('on 401 opens a re-login dialog, then resubmits without retyping', async () => {
    const user = userEvent.setup()
    posts.create.mockRejectedValueOnce(new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'hết hạn' }))
    posts.create.mockResolvedValueOnce({ id: 9 })
    signIn.mockResolvedValue()
    const router = renderPage()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đăng nhập lại để đăng bài' })
    expect(dialog).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'a@b.vn')
    await user.type(screen.getByLabelText('Mật khẩu'), 'matkhau1')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập và đăng bài' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/posts/9'))
    expect(signIn).toHaveBeenCalledWith({ email: 'a@b.vn', password: 'matkhau1' })
    expect(posts.create).toHaveBeenCalledTimes(2)
    expect(posts.create.mock.calls[1][0]).toEqual(posts.create.mock.calls[0][0])
  })

  it('keeps the form when the re-login dialog is cancelled', async () => {
    const user = userEvent.setup()
    posts.create.mockRejectedValue(new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'hết hạn' }))
    renderPage()
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Đăng bài' }))
    await user.click(await screen.findByRole('button', { name: 'Để sau' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Phở bò nhà làm')
  })

  it('searches dishes through the API with the typed text', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('option', { name: 'Phở bò' })
    await user.type(screen.getByLabelText('Tìm món ăn'), 'bún')
    await waitFor(() => expect(dishes.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bún', limit: 20 })))
  })

  it('adds and removes ingredient and step rows (at least one remains)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }))
    expect(screen.getByLabelText('Tên nguyên liệu 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xóa nguyên liệu 2' }))
    expect(screen.queryByLabelText('Tên nguyên liệu 2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa nguyên liệu 1' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Thêm bước' }))
    expect(screen.getByLabelText('Bước 2')).toBeInTheDocument()
  })

  it('asks before leaving with unsent data, and lets the user stay', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const router = renderPage()
    await user.type(screen.getByLabelText('Tiêu đề'), 'Dở dang')
    await user.click(screen.getByRole('link', { name: 'rời trang' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe('/posts/new')
    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('link', { name: 'rời trang' }))
    expect(await screen.findByText('bảng tin')).toBeInTheDocument()
  })

  it('does not warn when the form is empty', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm')
    renderPage()
    await user.click(screen.getByRole('link', { name: 'rời trang' }))
    expect(await screen.findByText('bảng tin')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })
})
