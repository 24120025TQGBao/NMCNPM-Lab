// Nơi DUY NHẤT biết tên trường của API và tên cột DB. Component chỉ dùng model camelCase trả về từ đây.
// Mọi hàm chịu được trường thiếu (contract có thể thay đổi): trả null hoặc giá trị mặc định thay vì ném lỗi.
// ID: post/dish/ingredient là số nguyên, author.id là UUID (api.md v1.0). Mapper giữ nguyên giá trị API trả, không ép kiểu khi đọc.

const str = (v) => (typeof v === 'string' ? v : null)
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const count = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

// { page, limit, total } theo contract; thiếu meta thì suy ra từ số phần tử (dạng mảng thuần trên main).
export function mapMeta(meta, fallbackLength = 0) {
  return {
    page: num(meta?.page) ?? 1,
    limit: num(meta?.limit) ?? fallbackLength,
    total: num(meta?.total) ?? fallbackLength,
  }
}

// Nhận cả: { id, name } (contract) và { ma_mon, ten_mon, mo_ta_ngan, hinh_anh } (cột DB mà main đang trả).
export function mapDish(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id ?? raw.ma_mon ?? null,
    name: str(raw.name) ?? str(raw.ten_mon) ?? '',
    description: str(raw.description) ?? str(raw.mo_ta_ngan) ?? '',
    imageUrl: str(raw.image_url) ?? str(raw.hinh_anh),
  }
}

// Danh sách món: chấp nhận mảng thuần (main) hoặc { data, meta } (contract).
export function mapDishList(body) {
  const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []
  const data = items.map(mapDish).filter(Boolean)
  return { data, meta: mapMeta(Array.isArray(body) ? null : body?.meta, data.length) }
}

export function mapAuthor(raw) {
  if (!raw || typeof raw !== 'object') return null
  return { id: raw.id ?? null, displayName: str(raw.display_name) ?? '' }
}

// quantity: null nghĩa là "Tùy khẩu vị" (G7).
export function mapIngredient(raw) {
  const quantity = num(raw?.quantity)
  return {
    ingredientId: raw?.ingredient_id ?? null,
    name: str(raw?.name) ?? '',
    quantity,
    unit: str(raw?.unit),
    toTaste: quantity === null,
    role: raw?.role === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY', // api.md v1.0
  }
}

export function mapStep(raw, index = 0) {
  return { order: num(raw?.order) ?? index + 1, content: str(raw?.content) ?? '' }
}

function mapPostBase(raw) {
  return {
    id: raw?.id ?? null,
    type: str(raw?.type) ?? 'RECIPE', // contract chưa có `type` (api-assumptions.md)
    title: str(raw?.title) ?? '',
    content: str(raw?.content) ?? '',
    createdAt: str(raw?.created_at),
    updatedAt: str(raw?.updated_at),
    dish: raw?.dish ? { id: raw.dish.id ?? null, name: str(raw.dish.name) ?? '' } : null,
    author: mapAuthor(raw?.author),
    status: str(raw?.status) ?? 'PUBLISHED',
    likeCount: count(raw?.like_count),
    dislikeCount: count(raw?.dislike_count),
    commentCount: count(raw?.comment_count),
    myReaction: raw?.my_reaction === 'like' || raw?.my_reaction === 'dislike' ? raw.my_reaction : null,
    // Chỉ bài đánh giá quán (giả định):
    restaurant: raw?.restaurant
      ? {
        name: str(raw.restaurant.name) ?? '',
        address: str(raw.restaurant.address) ?? '',
        priceRange: str(raw.restaurant.price_range),
      }
      : null,
  }
}

// Bài trong danh sách. Contract thật chưa có số nguyên liệu/bước nên suy ra từ mảng nếu có, nếu không dùng *_count.
export function mapPostSummary(raw) {
  const post = mapPostBase(raw)
  return {
    ...post,
    ingredientCount: Array.isArray(raw?.ingredients) ? raw.ingredients.length : count(raw?.ingredient_count),
    stepCount: Array.isArray(raw?.steps) ? raw.steps.length : count(raw?.step_count),
  }
}

export function mapPostDetail(raw) {
  const ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients.map(mapIngredient) : []
  const steps = (Array.isArray(raw?.steps) ? raw.steps.map(mapStep) : []).sort((a, b) => a.order - b.order)
  return { ...mapPostBase(raw), ingredients, steps, ingredientCount: ingredients.length, stepCount: steps.length }
}

export function mapPostPage(body) {
  const items = Array.isArray(body?.data) ? body.data : []
  return { data: items.map(mapPostSummary), meta: mapMeta(body?.meta, items.length) }
}

export function mapComment(raw) {
  const editedAt = str(raw?.edited_at)
  return {
    id: raw?.id ?? null,
    postId: raw?.post_id ?? null,
    content: str(raw?.content) ?? '',
    author: mapAuthor(raw?.author),
    createdAt: str(raw?.created_at),
    editedAt,
    edited: editedAt !== null,
  }
}

export function mapReport(raw) {
  return {
    id: raw?.id ?? null,
    targetType: str(raw?.target_type), // 'POST' | 'COMMENT'
    targetId: raw?.target_id ?? null,
    excerpt: str(raw?.excerpt) ?? '',
    reason: str(raw?.reason) ?? '',
    reportCount: count(raw?.report_count) || 1,
    createdAt: str(raw?.created_at),
    status: str(raw?.status) ?? 'PENDING', // 'PENDING' | 'RESOLVED'
    resolution: raw?.resolution
      ? {
        handledBy: str(raw.resolution.handled_by) ?? '',
        handledAt: str(raw.resolution.handled_at),
        reason: str(raw.resolution.reason) ?? '',
      }
      : null,
  }
}

export function mapRecipeSummary(raw) {
  const ingredientCount = Array.isArray(raw?.ingredients) ? raw.ingredients.length : count(raw?.ingredient_count)
  return {
    id: raw?.id ?? null,
    dishId: raw?.dish_id ?? null,
    name: str(raw?.name) ?? '',
    prepTimeMinutes: num(raw?.prep_time_minutes),
    ingredientCount,
    incomplete: raw?.incomplete === true,
  }
}

export function mapRecipeDetail(raw) {
  const ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients.map(mapIngredient) : []
  const steps = (Array.isArray(raw?.steps) ? raw.steps.map(mapStep) : []).sort((a, b) => a.order - b.order)
  return { ...mapRecipeSummary(raw), ingredients, steps, ingredientCount: ingredients.length }
}

// Danh sách chung: áp mapper cho { data: [...], meta }.
export function mapPage(body, mapItem) {
  const items = Array.isArray(body?.data) ? body.data : []
  return { data: items.map(mapItem), meta: mapMeta(body?.meta, items.length) }
}

export const unwrap = (body) => body?.data ?? null

// api.md v1.0: dish_id và ingredient_id là SỐ NGUYÊN, backend từ chối chuỗi ("17"). Ô chọn trả chuỗi nên ép ở đây.
const toIntegerId = (v) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v)

// Dữ liệu gửi lên: model giao diện -> body contract (snake_case).
export function toCreatePostBody(input) {
  const body = {
    dish_id: toIntegerId(input.dishId),
    title: input.title,
    ingredients: (input.ingredients ?? []).map((i) => {
      const row = { quantity: i.toTaste ? null : i.quantity ?? null, unit: i.unit || null }
      if (i.ingredientId) row.ingredient_id = toIntegerId(i.ingredientId)
      else row.name = i.name
      return row
    }),
    steps: (input.steps ?? []).map((s) => ({ content: typeof s === 'string' ? s : s.content })),
  }
  if (input.content) body.content = input.content // backend nhánh BE04 nhận `content` (chưa có trong api.md)
  if (input.status) body.status = input.status // giả định: 'DRAFT' | 'PUBLISHED'
  return body
}
