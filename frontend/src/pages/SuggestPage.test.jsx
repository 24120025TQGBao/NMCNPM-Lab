import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SuggestSessionProvider } from '../features/suggest/SuggestSessionContext'
import SuggestPage from './SuggestPage'
import { getSuggestions } from '../api/suggestionsApi'

vi.mock('../api/suggestionsApi', () => ({ getSuggestions: vi.fn(async () => []) }))
vi.mock('../api/ingredientsApi', () => ({ searchIngredients: vi.fn(async () => []) }))
vi.mock('../api/dishMatchApi', () => ({ matchDishes: vi.fn(async () => []) }))

describe('SuggestPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    getSuggestions.mockClear()
  })

  it('mở thẳng tab nguyên liệu thì chưa gọi API gợi ý, chuyển sang tab đó mới gọi', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/goi-y?tab=nguyen-lieu']}>
        <SuggestSessionProvider>
          <SuggestPage />
        </SuggestSessionProvider>
      </MemoryRouter>
    )

    expect(getSuggestions).not.toHaveBeenCalled()

    await user.click(screen.getByRole('tab', { name: /Khám phá/ }))
    await waitFor(() => expect(getSuggestions).toHaveBeenCalledTimes(1))
  })

  it('lỗi tải gợi ý: hiện câu thông báo cố định, không lộ chữ kỹ thuật', async () => {
    getSuggestions.mockRejectedValueOnce(new Error('Failed to fetch'))
    render(
        <MemoryRouter initialEntries={['/goi-y']}>
        <SuggestSessionProvider>
            <SuggestPage />
        </SuggestSessionProvider>
        </MemoryRouter>
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được gợi ý. Vui lòng thử lại.')
    expect(alert).not.toHaveTextContent('Failed to fetch')
    })
})