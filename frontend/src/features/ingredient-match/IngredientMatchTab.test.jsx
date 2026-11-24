import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SuggestSessionProvider } from '../suggest/SuggestSessionContext'
import IngredientMatchTab from './components/IngredientMatchTab'
import { searchIngredients } from '../../api/ingredientsApi'
import { matchDishes } from '../../api/dishMatchApi'

vi.mock('../../api/ingredientsApi', () => ({ searchIngredients: vi.fn() }))
vi.mock('../../api/dishMatchApi', () => ({ matchDishes: vi.fn() }))

const tomato = { id: 1, name: 'Cà chua', isBasicPantry: false }

const readyDish = {
  id: 10, name: 'Trứng chiên cà chua', imageUrl: null, matchRatio: 1,
  haveCount: 3, totalCount: 3, missing: [], readiness: 'READY', isIncomplete: false,
}
const incompleteDish = {
  id: 11, name: 'Món thiếu dữ liệu', imageUrl: null, matchRatio: 1,
  haveCount: 2, totalCount: 2, missing: [], readiness: 'READY', isIncomplete: true,
}

// Cho phép ẩn/hiện tab mà Provider vẫn sống, giống việc đi sang /dishes/:id rồi Back
function Harness() {
  const [show, setShow] = useState(true)
  return (
    <MemoryRouter>
      <SuggestSessionProvider>
        <button type="button" onClick={() => setShow((s) => !s)}>
          toggle
        </button>
        {show && <IngredientMatchTab />}
      </SuggestSessionProvider>
    </MemoryRouter>
  )
}

async function addTomato(user) {
  await user.type(screen.getByPlaceholderText(/Nhập nguyên liệu/), 'ca chua')
  await user.click(await screen.findByRole('option', { name: /Cà chua/ }, { timeout: 2000 }))
}

describe('IngredientMatchTab', () => {
  beforeEach(() => {
    sessionStorage.clear()
    searchIngredients.mockReset()
    matchDishes.mockReset()
    searchIngredients.mockResolvedValue([tomato])
    matchDishes.mockResolvedValue([readyDish])
  })

  it('chưa chọn nguyên liệu: nút "Tìm món" bị vô hiệu và không gọi API (QĐ 4.1)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const button = screen.getByRole('button', { name: /Tìm món/ })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(matchDishes).not.toHaveBeenCalled()
  })

  it('chọn nguyên liệu từ gợi ý rồi tìm: gọi API với id và pantry=true', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await addTomato(user)
    expect(screen.getByRole('button', { name: 'Bỏ Cà chua' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tìm món/ }))
    expect(await screen.findByText('Trứng chiên cà chua')).toBeInTheDocument()
    expect(matchDishes).toHaveBeenCalledTimes(1)
    expect(matchDishes.mock.calls[0][0]).toMatchObject({ ingredients: [1], pantry: true })
  })

  it('món isIncomplete không nằm ở "Nấu ngay" và có cảnh báo (QĐ 4.4)', async () => {
    matchDishes.mockResolvedValue([incompleteDish])
    const user = userEvent.setup()
    render(<Harness />)
    await addTomato(user)
    await user.click(screen.getByRole('button', { name: /Tìm món/ }))

    expect(await screen.findByText('Món thiếu dữ liệu')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Nấu ngay/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Chưa đủ dữ liệu để kết luận/ })).toBeInTheDocument()
  })

  it('đổi công tắc tủ bếp sau khi có kết quả thì tìm lại với pantry=false (FR-32)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await addTomato(user)
    await user.click(screen.getByRole('button', { name: /Tìm món/ }))
    await screen.findByText('Trứng chiên cà chua')

    await user.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(matchDishes).toHaveBeenCalledTimes(2))
    expect(matchDishes.mock.calls[1][0]).toMatchObject({ pantry: false })
  })

  it('lỗi: giữ nguyên nguyên liệu đã chọn, "Thử lại" thành công (FR-37)', async () => {
    matchDishes.mockRejectedValueOnce(new Error('Lỗi mạng'))
    const user = userEvent.setup()
    render(<Harness />)
    await addTomato(user)
    await user.click(screen.getByRole('button', { name: /Tìm món/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bỏ Cà chua' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Thử lại/ }))
    expect(await screen.findByText('Trứng chiên cà chua')).toBeInTheDocument()
  })

  it('rời tab rồi quay lại: giữ nguyên nguyên liệu và kết quả, không gọi lại API (FR-38)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await addTomato(user)
    await user.click(screen.getByRole('button', { name: /Tìm món/ }))
    await screen.findByText('Trứng chiên cà chua')

    await user.click(screen.getByRole('button', { name: 'toggle' })) // ẩn tab
    expect(screen.queryByText('Trứng chiên cà chua')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'toggle' })) // hiện lại

    expect(screen.getByText('Trứng chiên cà chua')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bỏ Cà chua' })).toBeInTheDocument()
    expect(matchDishes).toHaveBeenCalledTimes(1)
  })

  it('nhấn Enter khi chưa chọn nguyên liệu: hiện lỗi và không gọi API (QĐ 4.1)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByPlaceholderText(/Nhập nguyên liệu/))
    await user.keyboard('{Enter}')

    expect(screen.getByText('Hãy chọn ít nhất 1 nguyên liệu')).toBeInTheDocument()
    expect(matchDishes).not.toHaveBeenCalled()
    })

  it('ô nhập là combobox; phím mũi tên chọn gợi ý và aria-activedescendant cập nhật', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByRole('combobox', { name: /nguyên liệu gì/i })
    await user.type(input, 'ca chua')
    await screen.findByRole('option', { name: /Cà chua/ }, { timeout: 2000 })

    await user.keyboard('{ArrowDown}')
    const option = screen.getByRole('option', { name: /Cà chua/ })
    expect(input).toHaveAttribute('aria-activedescendant', option.id)

    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Bỏ Cà chua' })).toBeInTheDocument()
    })
})