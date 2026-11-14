import { vi } from '../../i18n/vi'

const t = vi.createPost.validation

// Chấp nhận dấu phẩy thập phân ("1,5"). Trả NaN nếu không phải số hữu hạn.
export function parseQuantity(text) {
  const normalized = String(text ?? '').trim().replace(',', '.')
  if (!normalized) return NaN
  return Number(normalized)
}

// Khớp bảng Validation của api.md v1.0 (BE03). Khóa lỗi dùng đúng tên trường của API
// (dish_id, title, ingredients[0].quantity...) để lỗi 400 từ máy chủ và lỗi phía giao diện dùng chung một chỗ hiển thị.
// form: { dishId, title, content, ingredients[{name, quantity, unit, toTaste}], steps[{content}] }
export function validatePostForm(form) {
  const errors = {}
  if (!form.dishId) errors.dish_id = t.dishRequired
  const title = form.title.trim()
  if (title.length < 3 || title.length > 150) errors.title = t.titleLength
  if (form.content.trim().length > 2000) errors.content = t.contentTooLong

  if (form.ingredients.length < 1) errors.ingredients = t.ingredientsRequired
  else if (form.ingredients.length > 50) errors.ingredients = t.ingredientsTooMany
  const seen = new Set()
  form.ingredients.forEach((row, i) => {
    const key = row.name.trim().toLowerCase()
    if (key && seen.has(key)) errors[`ingredients[${i}].name`] = t.ingredientDuplicate // backend từ chối trùng tên (không phân biệt hoa thường)
    seen.add(key)
    if (!row.name.trim()) errors[`ingredients[${i}].name`] = t.ingredientNameRequired
    if (!row.toTaste) {
      const q = parseQuantity(row.quantity)
      if (!Number.isFinite(q) || q <= 0) errors[`ingredients[${i}].quantity`] = t.quantityPositive
    }
    if (row.unit.trim().length > 30) errors[`ingredients[${i}].unit`] = t.unitLength
  })

  if (form.steps.length < 1) errors.steps = t.stepsRequired
  else if (form.steps.length > 50) errors.steps = t.stepsTooMany
  form.steps.forEach((row, i) => {
    const text = row.content.trim()
    if (!text) errors[`steps[${i}].content`] = t.stepRequired
    else if (text.length > 1000) errors[`steps[${i}].content`] = t.stepTooLong
  })
  return errors
}

// Dữ liệu gửi cho posts.create (service tự đổi sang snake_case và ép dish_id về số).
export function toPostInput(form) {
  const content = form.content.trim()
  return {
    dishId: form.dishId,
    title: form.title.trim(),
    ...(content ? { content } : {}),
    ingredients: form.ingredients.map((row) => ({
      name: row.name.trim(),
      quantity: row.toTaste ? null : parseQuantity(row.quantity),
      unit: row.unit.trim() || null,
      toTaste: row.toTaste,
    })),
    steps: form.steps.map((row) => ({ content: row.content.trim() })),
  }
}

// Đưa lỗi 400 của máy chủ về đúng ô nhập. Backend báo nguyên liệu trùng ở `ingredients[i]` (không có `.name`),
// và có thể trả trường mà form không có ô tương ứng: những lỗi đó vào `general` để vẫn hiện cho người dùng.
export function routeServerErrors(fields, form) {
  const errors = {}
  const general = []
  const ing = form.ingredients.length
  const stp = form.steps.length
  for (const [rawKey, message] of Object.entries(fields ?? {})) {
    let key = rawKey
    if (/^ingredients\[\d+\]$/.test(key)) key = `${key}.name`
    const m = key.match(/^(ingredients|steps)\[(\d+)\]\.(\w+)$/)
    const known = ['dish_id', 'title', 'content', 'ingredients', 'steps'].includes(key) ||
      (m && Number(m[2]) < (m[1] === 'ingredients' ? ing : stp) &&
        (m[1] === 'ingredients' ? ['name', 'quantity', 'unit'] : ['content']).includes(m[3]))
    if (known) errors[key] ??= message
    else general.push(message)
  }
  return { errors, general }
}
