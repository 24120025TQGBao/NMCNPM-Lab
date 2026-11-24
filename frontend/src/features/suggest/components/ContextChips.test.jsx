import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContextChips from './ContextChips'

describe('ContextChips', () => {
  it('chip đang chọn có aria-pressed=true, chip khác là false', () => {
    render(
      <ContextChips
        selectedChips={['TROI_MUA']}
        selectedRegion={null}
        onToggleChip={() => {}}
        onSelectRegion={() => {}}
        onClearAll={() => {}}
        disabled={false}
      />
    )
    expect(screen.getByRole('button', { name: /Trời mưa/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Lười nấu/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('bấm chip gọi onToggleChip với đúng mã', async () => {
    const onToggleChip = vi.fn()
    const user = userEvent.setup()
    render(
      <ContextChips
        selectedChips={[]}
        selectedRegion={null}
        onToggleChip={onToggleChip}
        onSelectRegion={() => {}}
        onClearAll={() => {}}
        disabled={false}
      />
    )
    await user.click(screen.getByRole('button', { name: /Lười nấu/ }))
    expect(onToggleChip).toHaveBeenCalledWith('LUOI_NAU')
  })
})