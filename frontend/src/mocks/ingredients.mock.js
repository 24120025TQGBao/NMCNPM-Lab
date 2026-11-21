// Mock danh sách nguyên liệu (GET /api/ingredients?search=&limit=)

let mockMode = 'ok' // 'ok' | 'empty' | 'error'

export function setMockMode(mode) {
  mockMode = mode
}

export function getMockMode() {
  return mockMode
}

// Hàm chuẩn hóa chuỗi tiếng Việt bỏ dấu để tìm kiếm không dấu
export function normalizeVietnamese(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

// Ít nhất 15 nguyên liệu có dấu
export const MOCK_INGREDIENTS = [
  { id: 1, ten: 'Cà chua', la_gia_vi_co_ban: false },
  { id: 2, ten: 'Hành lá', la_gia_vi_co_ban: false },
  { id: 3, ten: 'Trứng gà', la_gia_vi_co_ban: false },
  { id: 4, ten: 'Thịt ba chỉ', la_gia_vi_co_ban: false },
  { id: 5, ten: 'Thịt bò', la_gia_vi_co_ban: false },
  { id: 6, ten: 'Tỏi', la_gia_vi_co_ban: true },
  { id: 7, ten: 'Nước mắm', la_gia_vi_co_ban: true },
  { id: 8, ten: 'Muối', la_gia_vi_co_ban: true },
  { id: 9, ten: 'Đường', la_gia_vi_co_ban: true },
  { id: 10, ten: 'Dầu ăn', la_gia_vi_co_ban: true },
  { id: 11, ten: 'Tiêu', la_gia_vi_co_ban: true },
  { id: 12, ten: 'Đậu phụ', la_gia_vi_co_ban: false },
  { id: 13, ten: 'Khoai tây', la_gia_vi_co_ban: false },
  { id: 14, ten: 'Cà rốt', la_gia_vi_co_ban: false },
  { id: 15, ten: 'Ớt tươi', la_gia_vi_co_ban: false },
  { id: 16, ten: 'Gừng', la_gia_vi_co_ban: false },
  { id: 17, ten: 'Sả', la_gia_vi_co_ban: false },
  { id: 18, ten: 'Hành tây', la_gia_vi_co_ban: false },
]

export async function fetchMockIngredients({ search = '', limit = 8 } = {}) {
  await new Promise((r) => setTimeout(r, 200))

  if (mockMode === 'error') {
    const error = new Error('Lỗi tìm kiếm nguyên liệu (Mock error)')
    error.status = 500
    throw error
  }

  if (mockMode === 'empty') {
    return { data: [] }
  }

  const query = normalizeVietnamese(search)
  if (!query) {
    return { data: [] }
  }

  const filtered = MOCK_INGREDIENTS.filter((item) =>
    normalizeVietnamese(item.ten).includes(query)
  )

  const take = Math.max(1, Number(limit) || 8)
  return { data: filtered.slice(0, take) }
}
