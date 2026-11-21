// Ánh xạ duy nhất giữa response API (contract hoặc DB thô) và View Model cho frontend.

const str = (v) => (typeof v === 'string' ? v : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Ánh xạ món ăn gợi ý từ GET /api/suggestions
 * API format (mục 5.3):
 * {
 *   id: 12,
 *   ten_mon: "Canh chua cá lóc",
 *   mo_ta_ngan: "Canh chua thanh mát...",
 *   hinh_anh: "...",
 *   thoi_gian_che_bien: 30,
 *   khau_vi: "CHUA",
 *   the: ["TROI_MUA"]
 * }
 */
export function mapSuggestionDish(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id ?? raw.ma_mon ?? null,
    name: str(raw.name) ?? str(raw.ten_mon) ?? '',
    shortDescription: str(raw.short_description) ?? str(raw.mo_ta_ngan) ?? null,
    imageUrl: str(raw.image_url) ?? str(raw.hinh_anh) ?? null,
    cookTimeMinutes: num(raw.cook_time_minutes) ?? num(raw.thoi_gian_che_bien) ?? null,
    flavor: str(raw.flavor) ?? str(raw.khau_vi) ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : Array.isArray(raw.the) ? raw.the : [],
  }
}

export function mapSuggestionList(body) {
  const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  return items.map(mapSuggestionDish).filter(Boolean)
}

/**
 * Ánh xạ nguyên liệu từ GET /api/ingredients?search=
 * API format:
 * { id: 5, ten: "Cà chua", la_gia_vi_co_ban: false }
 */
export function mapIngredientItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id ?? raw.ma_nl ?? null,
    name: str(raw.name) ?? str(raw.ten) ?? str(raw.ten_nl) ?? '',
    isBasicPantry: Boolean(raw.is_basic_pantry ?? raw.la_gia_vi_co_ban ?? false),
  }
}

export function mapIngredientList(body) {
  const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  return items.map(mapIngredientItem).filter(Boolean)
}

/**
 * Ánh xạ kết quả đối sánh món từ GET /api/dishes/match
 * API format:
 * {
 *   id: 7,
 *   ten_mon: "Trứng chiên cà chua",
 *   hinh_anh: null,
 *   ty_le_khop: 0.71,
 *   so_co: 5,
 *   so_tong: 7,
 *   nguyen_lieu_thieu: [{ id: 3, ten: "Hành lá", role: "SECONDARY" }],
 *   muc_san_sang: "THIEU_1_2", // NAU_NGAY | THIEU_1_2 | CAN_DI_CHO
 *   chua_day_du: false
 * }
 */
export function mapMatchDish(raw) {
  if (!raw || typeof raw !== 'object') return null

  const rawMissing = Array.isArray(raw.missing)
    ? raw.missing
    : Array.isArray(raw.nguyen_lieu_thieu)
      ? raw.nguyen_lieu_thieu
      : []

  const missing = rawMissing.map((m) => ({
    id: m.id ?? m.ma_nl ?? 0,
    name: str(m.name) ?? str(m.ten) ?? '',
    role: m.role === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY',
  }))

  const rawReadiness = str(raw.readiness) ?? str(raw.muc_san_sang) ?? 'CAN_DI_CHO'
  let readiness = 'NEED_SHOPPING'
  if (rawReadiness === 'NAU_NGAY' || rawReadiness === 'READY') {
    readiness = 'READY'
  } else if (rawReadiness === 'THIEU_1_2' || rawReadiness === 'MISSING_1_2') {
    readiness = 'MISSING_1_2'
  }

  return {
    id: raw.id ?? raw.ma_mon ?? null,
    name: str(raw.name) ?? str(raw.ten_mon) ?? '',
    imageUrl: str(raw.image_url) ?? str(raw.hinh_anh) ?? null,
    matchRatio: num(raw.match_ratio) ?? num(raw.ty_le_khop) ?? 0,
    haveCount: num(raw.have_count) ?? num(raw.so_co) ?? 0,
    totalCount: num(raw.total_count) ?? num(raw.so_tong) ?? 0,
    missing,
    readiness,
    isIncomplete: Boolean(raw.is_incomplete ?? raw.chua_day_du ?? false),
  }
}

export function mapMatchDishList(body) {
  const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  return items.map(mapMatchDish).filter(Boolean)
}
