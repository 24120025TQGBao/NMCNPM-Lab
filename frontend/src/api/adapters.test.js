import { describe, it, expect } from 'vitest'
import {
  mapSuggestionDish,
  mapSuggestionList,
  mapIngredientItem,
  mapMatchDish,
} from './adapters'

describe('adapters.js', () => {
  it('maps raw suggestion dish accurately', () => {
    const raw = {
      id: 12,
      ten_mon: 'Canh chua cá lóc',
      mo_ta_ngan: 'Canh chua thanh mát',
      hinh_anh: 'https://img.com/canh-chua.jpg',
      thoi_gian_che_bien: 30,
      khau_vi: 'CHUA',
      the: ['TROI_MUA'],
    }
    const mapped = mapSuggestionDish(raw)
    expect(mapped).toEqual({
      id: 12,
      name: 'Canh chua cá lóc',
      shortDescription: 'Canh chua thanh mát',
      imageUrl: 'https://img.com/canh-chua.jpg',
      cookTimeMinutes: 30,
      flavor: 'CHUA',
      tags: ['TROI_MUA'],
    })
  })

  it('maps suggestion list with null safe filter', () => {
    const res = mapSuggestionList({ data: [{ id: 1, ten_mon: 'Món 1' }, null] })
    expect(res).toHaveLength(1)
    expect(res[0].name).toBe('Món 1')
  })

  it('maps ingredient items correctly', () => {
    const raw = { id: 5, ten: 'Cà chua', la_gia_vi_co_ban: false }
    const mapped = mapIngredientItem(raw)
    expect(mapped).toEqual({
      id: 5,
      name: 'Cà chua',
      isBasicPantry: false,
    })
  })

  it('maps match dish items and handles readiness and incomplete flags', () => {
    const raw = {
      id: 7,
      ten_mon: 'Trứng chiên cà chua',
      hinh_anh: null,
      ty_le_khop: 0.71,
      so_co: 5,
      so_tong: 7,
      nguyen_lieu_thieu: [{ id: 3, ten: 'Hành lá', role: 'SECONDARY' }],
      muc_san_sang: 'THIEU_1_2',
      chua_day_du: true,
    }
    const mapped = mapMatchDish(raw)
    expect(mapped).toEqual({
      id: 7,
      name: 'Trứng chiên cà chua',
      imageUrl: null,
      matchRatio: 0.71,
      haveCount: 5,
      totalCount: 7,
      missing: [{ id: 3, name: 'Hành lá', role: 'SECONDARY' }],
      readiness: 'MISSING_1_2',
      isIncomplete: true,
    })
  })
})
