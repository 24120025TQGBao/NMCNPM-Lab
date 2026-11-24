// Mock đối sánh món ăn theo nguyên liệu (GET /api/dishes/match)

let mockMode = 'ok' // 'ok' | 'empty' | 'error'

export function setMockMode(mode) {
  mockMode = mode
}

export function getMockMode() {
  return mockMode
}

// Dữ liệu bao phủ cả 4 nhóm:
// 1. Nấu ngay (ty_le_khop = 1, muc_san_sang = NAU_NGAY, chua_day_du = false)
// 2. Thiếu 1-2 thứ (muc_san_sang = THIEU_1_2, chua_day_du = false)
// 3. Cần đi chợ (muc_san_sang = CAN_DI_CHO, chua_day_du = false)
// 4. Chưa đủ dữ liệu (chua_day_du = true)
export const MOCK_MATCH_DISHES = [
  {
    id: 101,
    ten_mon: 'Trứng chiên cà chua',
    hinh_anh: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80',
    ty_le_khop: 1.0,
    so_co: 4,
    so_tong: 4,
    nguyen_lieu_thieu: [],
    muc_san_sang: 'NAU_NGAY',
    chua_day_du: false,
  },
  {
    id: 102,
    ten_mon: 'Thịt ba chỉ rang cháy cạnh',
    hinh_anh: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
    ty_le_khop: 0.8,
    so_co: 4,
    so_tong: 5,
    nguyen_lieu_thieu: [
      { id: 2, ten: 'Hành lá', role: 'SECONDARY' }
    ],
    muc_san_sang: 'THIEU_1_2',
    chua_day_du: false,
  },
  {
    id: 103,
    ten_mon: 'Bò xào hành tây cần tỏi',
    hinh_anh: null,
    ty_le_khop: 0.75,
    so_co: 3,
    so_tong: 4,
    nguyen_lieu_thieu: [
      { id: 18, ten: 'Hành tây', role: 'PRIMARY' }
    ],
    muc_san_sang: 'THIEU_1_2',
    chua_day_du: false,
  },
  {
    id: 104,
    ten_mon: 'Canh sườn hầm khoai tây cà rốt',
    hinh_anh: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80',
    ty_le_khop: 0.4,
    so_co: 2,
    so_tong: 5,
    nguyen_lieu_thieu: [
      { id: 201, ten: 'Sườn heo', role: 'PRIMARY' },
      { id: 13, ten: 'Khoai tây', role: 'SECONDARY' },
      { id: 14, ten: 'Cà rốt', role: 'SECONDARY' },
    ],
    muc_san_sang: 'CAN_DI_CHO',
    chua_day_du: false,
  },
  {
    id: 105,
    ten_mon: 'Lẩu hải sản thập cẩm chua cay',
    hinh_anh: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80',
    ty_le_khop: 0.3,
    so_co: 3,
    so_tong: 10,
    nguyen_lieu_thieu: [
      { id: 202, ten: 'Tôm sú', role: 'PRIMARY' },
      { id: 203, ten: 'Mực ống', role: 'PRIMARY' },
      { id: 204, ten: 'Nấm kim châm', role: 'SECONDARY' },
      { id: 205, ten: 'Rau muống', role: 'SECONDARY' },
      { id: 206, ten: 'Gói gia vị lẩu', role: 'SECONDARY' },
    ],
    muc_san_sang: 'CAN_DI_CHO',
    chua_day_du: false,
  },
  {
    id: 106,
    ten_mon: 'Gà hấp lá chanh gia truyền',
    hinh_anh: null,
    ty_le_khop: 0.9,
    so_co: 3,
    so_tong: 3,
    nguyen_lieu_thieu: [],
    muc_san_sang: 'NAU_NGAY', // Mặc dù là NAU_NGAY nhưng chua_day_du = true thì KHÔNG được vào nhóm Nấu ngay!
    chua_day_du: true,
  },
  {
    id: 107,
    ten_mon: 'Salad dưa leo cà chua bi',
    hinh_anh: null,
    ty_le_khop: 0.6,
    so_co: 2,
    so_tong: 3,
    nguyen_lieu_thieu: [
      { id: 207, ten: 'Dưa leo', role: 'PRIMARY' }
    ],
    muc_san_sang: 'THIEU_1_2',
    chua_day_du: true,
  },
]

// Mô phỏng backend khi tắt "tủ bếp cơ bản": muối bị coi là thiếu thêm một thứ.
const SALT = { id: 8, ten: 'Muối', role: 'SECONDARY' }

function withoutPantry(dishes) {
  return dishes
    .map((d) => {
      if (!d.so_tong || d.so_co === 0 || d.nguyen_lieu_thieu.some((m) => m.id === SALT.id)) {
        return d
      }
      const soCo = d.so_co - 1
      const missing = [...d.nguyen_lieu_thieu, SALT]
      return {
        ...d,
        so_co: soCo,
        ty_le_khop: Number((soCo / d.so_tong).toFixed(2)),
        nguyen_lieu_thieu: missing,
        muc_san_sang: missing.length <= 2 ? 'THIEU_1_2' : 'CAN_DI_CHO',
      }
    })
    .sort((a, b) => b.ty_le_khop - a.ty_le_khop) // backend trả về giảm dần theo tỷ lệ khớp
}

export async function fetchMockDishMatch({ ingredients = '', pantry = true } = {}) {
  await new Promise((r) => setTimeout(r, 400))

  if (mockMode === 'error') {
    const error = new Error('Lỗi đối sánh món ăn (Mock error)')
    error.status = 500
    throw error
  }

  if (mockMode === 'empty') {
    return { data: [] }
  }

  const ids = String(ingredients)
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((n) => !Number.isNaN(n) && n > 0)

  if (ids.length === 0) {
    const error = new Error('Phải có ít nhất 1 nguyên liệu hợp lệ')
    error.status = 400
    throw error
  }

  // Giả lập kết quả trả về theo contract đã xếp ty_le_khop giảm dần
  const data = structuredClone(MOCK_MATCH_DISHES)
  return { data: pantry ? data : withoutPantry(data) }}
