import { describe, it, expect } from 'vitest'
import { groupMatchResults } from './groupMatchResults'

describe('groupMatchResults', () => {
  it('groups dishes into 4 buckets while keeping API order and strictly isolating incomplete dishes', () => {
    const mockDishes = [
      { id: 1, name: 'Món 1 - Sẵn sàng', readiness: 'READY', isIncomplete: false },
      { id: 2, name: 'Món 2 - Thiếu 1-2', readiness: 'MISSING_1_2', isIncomplete: false },
      { id: 3, name: 'Món 3 - Cần đi chợ', readiness: 'NEED_SHOPPING', isIncomplete: false },
      {
        id: 4,
        name: 'Món 4 - Đủ đồ nhưng thiếu dữ liệu',
        readiness: 'READY',
        isIncomplete: true, // QĐ 4.4: Phải vào nhóm chưa đủ dữ liệu, không được ở Nấu ngay!
      },
      { id: 5, name: 'Món 5 - Sẵn sàng 2', readiness: 'READY', isIncomplete: false },
    ]

    const groups = groupMatchResults(mockDishes)

    expect(groups).toHaveLength(4)
    expect(groups[0].id).toBe('READY')
    expect(groups[0].items.map((d) => d.id)).toEqual([1, 5]) // Thứ tự giữ nguyên

    expect(groups[1].id).toBe('MISSING_1_2')
    expect(groups[1].items.map((d) => d.id)).toEqual([2])

    expect(groups[2].id).toBe('NEED_SHOPPING')
    expect(groups[2].items.map((d) => d.id)).toEqual([3])

    expect(groups[3].id).toBe('INCOMPLETE')
    expect(groups[3].items.map((d) => d.id)).toEqual([4])
    expect(groups[3].title).toBe('Chưa đủ dữ liệu để kết luận')
  })

  it('hides empty groups when no dishes qualify', () => {
    const mockDishes = [
      { id: 1, name: 'Món 1', readiness: 'READY', isIncomplete: false },
    ]
    const groups = groupMatchResults(mockDishes)
    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('READY')
  })
})
