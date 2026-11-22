import { describe, it, expect } from 'vitest'
import { fetchMockDishMatch } from './dishMatch.mock'

describe('fetchMockDishMatch', () => {
  it('tắt tủ bếp cơ bản thì kết quả khác và vẫn xếp giảm dần theo tỷ lệ khớp', async () => {
    const on = await fetchMockDishMatch({ ingredients: '1', pantry: true })
    const off = await fetchMockDishMatch({ ingredients: '1', pantry: false })

    expect(off.data).not.toEqual(on.data)

    const ratios = off.data.map((d) => d.ty_le_khop)
    expect(ratios).toEqual([...ratios].sort((a, b) => b - a))
  })
})