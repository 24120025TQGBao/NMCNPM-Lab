// Mock dữ liệu và API cho gợi ý món (GET /api/suggestions)

let mockMode = 'ok' // 'ok' | 'empty' | 'error'

export function setMockMode(mode) {
  mockMode = mode
}

export function getMockMode() {
  return mockMode
}

// Ít nhất 8 món: có món không có ảnh, món tên rất dài, món nhiều thẻ
export const MOCK_SUGGESTIONS = [
  {
    id: 1,
    ten_mon: 'Canh chua cá lóc miền Tây thanh mát giải nhiệt',
    mo_ta_ngan: 'Canh chua đậm đà hương vị miền sông nước với cá lóc đồng, dứa, cà chua và đậu bắp.',
    hinh_anh: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 35,
    khau_vi: 'CHUA',
    the: ['TROI_MUA', 'CUOI_THANG'],
    vung_mien: 'NAM',
  },
  {
    id: 2,
    ten_mon: 'Trứng chiên nước mắm hành hoa thơm nức mũi cho bữa cơm vội vàng ngày mưa',
    mo_ta_ngan: 'Món ăn giản dị chỉ mất 10 phút nhưng cực kỳ bắt cơm, trứng xốp mềm ngập nước mắm tỏi ớt.',
    hinh_anh: null, // Món không có ảnh để test fallback
    thoi_gian_che_bien: 10,
    khau_vi: 'MAN',
    the: ['LUOI_NAU', 'CUOI_THANG', 'AN_NHE'],
    vung_mien: 'BAC',
  },
  {
    id: 3,
    ten_mon: 'Thịt kho tàu nước dừa trứng cút',
    mo_ta_ngan: 'Thịt ba chỉ mềm rục ngấm vị ngọt thanh nước dừa xiêm, màu cánh gián tự nhiên tuyệt đẹp.',
    hinh_anh: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 60,
    khau_vi: 'NGOT',
    the: ['NAU_CHO_4', 'TROI_MUA'],
    vung_mien: 'NAM',
  },
  {
    id: 4,
    ten_mon: 'Gỏi cuốn tôm thịt chấm sốt tương đậu phộng',
    mo_ta_ngan: 'Món thanh nhẹ không dầu mỡ, tôm tươi giòn ngọt ăn kèm rau thơm các loại.',
    hinh_anh: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 20,
    khau_vi: 'THANH',
    the: ['AN_NHE', 'LUOI_NAU'],
    vung_mien: 'NAM',
  },
  {
    id: 5,
    ten_mon: 'Mì cay hải sản kim chi cấp độ 3',
    mo_ta_ngan: 'Nước dùng chua cay đậm đà bốc khói nghi ngút, mực giòn ngọt cùng tôm và nấm kim châm.',
    hinh_anh: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 25,
    khau_vi: 'CAY',
    the: ['TROI_MUA', 'LUOI_NAU'],
    vung_mien: 'TRUNG',
  },
  {
    id: 6,
    ten_mon: 'Bò lúc lắc khoai tây chiên giòn rụm cho cả nhà',
    mo_ta_ngan: 'Bò mềm xào sốt tiêu đen đậm vị, rau củ quả ớt chuông hành tây bắt mắt.',
    hinh_anh: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 40,
    khau_vi: 'MAN',
    the: ['NAU_CHO_4'],
    vung_mien: 'BAC',
  },
  {
    id: 7,
    ten_mon: 'Salad ức gà áp chảo sốt mè rang',
    mo_ta_ngan: 'Healthy, no lâu mà lại dễ làm, phù hợp cho người ăn kiêng hoặc bữa phụ nhẹ nhàng.',
    hinh_anh: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 15,
    khau_vi: 'THANH',
    the: ['AN_NHE', 'LUOI_NAU', 'CUOI_THANG'],
    vung_mien: 'BAC',
  },
  {
    id: 8,
    ten_mon: 'Lẩu gà lá é Phú Yên nồng ấm',
    mo_ta_ngan: 'Hương thơm the mát đặc trưng của lá é quyện cùng thịt gà đồi ngọt chắc và ớt xiêm xanh.',
    hinh_anh: 'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=800&q=80',
    thoi_gian_che_bien: 50,
    khau_vi: 'CAY',
    the: ['TROI_MUA', 'NAU_CHO_4'],
    vung_mien: 'TRUNG',
  },
]

export async function fetchMockSuggestions({ exclude = '', the = '', random = false, limit = 1, vung_mien } = {}) {
  await new Promise((r) => setTimeout(r, 350))

  if (mockMode === 'error') {
    const error = new Error('Không thể tải gợi ý món ăn (Mock error)')
    error.status = 500
    throw error
  }

  if (mockMode === 'empty') {
    return { data: [] }
  }

  const excludeIds = exclude
    ? String(exclude)
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((n) => !Number.isNaN(n))
    : []

  const requestedTags = the
    ? String(the)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  let filtered = MOCK_SUGGESTIONS.filter((item) => {
    if (excludeIds.includes(item.id)) return false
    if (requestedTags.length > 0) {
      // AND condition: phải chứa tất cả tags
      const hasAllTags = requestedTags.every((tag) => item.the.includes(tag))
      if (!hasAllTags) return false
    }
    if (vung_mien && item.vung_mien !== vung_mien) return false
    return true
  })

  if (filtered.length === 0) {
    return { data: [] }
  }

  if (random) {
    filtered = [...filtered].sort(() => Math.random() - 0.5)
  }

  const take = Math.max(1, Number(limit) || 1)
  return { data: filtered.slice(0, take) }
}
