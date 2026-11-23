import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MatchResultGroup from './MatchResultGroup'

const makeDish = (id, missingCount = 0) => ({
  id,
  name: `Món ${id}`,
  imageUrl: null,
  matchRatio: 0.5,
  haveCount: 1,
  totalCount: 2,
  missing: Array.from({ length: missingCount }, (_, i) => ({
    id: 100 + i,
    name: `NL ${i + 1}`,
    role: 'SECONDARY',
  })),
  readiness: 'NEED_SHOPPING',
  isIncomplete: false,
})

function renderGroup(items) {
  return render(
    <MemoryRouter>
      <MatchResultGroup group={{ title: 'Cần đi chợ', items }} />
    </MemoryRouter>
  )
}

describe('MatchResultGroup', () => {
  it('nhóm có 8 món: hiện 6 món và "Xem thêm (2)", bấm thì hiện đủ 8 (9.3 #11)', async () => {
    const user = userEvent.setup()
    renderGroup([1, 2, 3, 4, 5, 6, 7, 8].map((id) => makeDish(id)))

    expect(screen.getAllByRole('link')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: /Xem thêm \(2\)/ }))
    expect(screen.getAllByRole('link')).toHaveLength(8)
  })

  it('món thiếu 6 nguyên liệu: hiện 4 chip và "+2" (9.3 #10)', () => {
    renderGroup([makeDish(1, 6)])

    expect(screen.getByText('NL 4')).toBeInTheDocument()
    expect(screen.queryByText('NL 5')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})