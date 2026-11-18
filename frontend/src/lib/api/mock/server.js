// Bộ giả lập backend trong bộ nhớ. CHỈ được nạp bằng import() động từ client.js khi
// import.meta.env.DEV và VITE_USE_MOCK === 'true'. Trả { status, body } đúng hình dạng contract thật
// ({ data, meta } | { error: { code, message, details } }, snake_case) và đi qua cùng đường chuẩn hóa lỗi
// như phản hồi thật. Dữ liệu mất khi tải lại trang.
import { COMMENTS, DISHES, POSTS, RECIPES, REACTIONS, REPORTS } from './seed'

const options = { latencyMs: 300 }
let state = freshState()
let failNextStatus = null

function freshState() {
  return {
    posts: structuredClone(POSTS),
    comments: structuredClone(COMMENTS),
    reports: structuredClone(REPORTS),
    reactions: structuredClone(REACTIONS),
    reportedBy: new Set(), // `${userId}|${targetType}|${targetId}` để trả 409 khi báo cáo trùng
    nextId: 1000,
  }
}

// ----- Điều khiển cho dev/test -----
export function resetMock() { state = freshState(); failNextStatus = null }
export function configureMock(next) { Object.assign(options, next) }
// Lần gọi mock kế tiếp trả lỗi với mã này (400, 401, 403, 404, 409, 500).
export function failNext(status) { failNextStatus = status }

if (typeof window !== 'undefined') {
  // Dùng trong console: __citrusMock.failNext(500)
  window.__citrusMock = { failNext, reset: resetMock, configure: configureMock }
}

// ----- Helper phản hồi -----
const ok = (data, meta) => ({ status: 200, body: meta ? { data, meta } : { data } })
const created = (data) => ({ status: 201, body: { data } })
const noContent = () => ({ status: 204, body: null })
const fail = (status, code, message, details) => ({
  status,
  body: { error: { code, message, ...(details ? { details } : {}) } },
})
const invalid = (field, message) => fail(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [{ field, message }])
const invalidAll = (details) => fail(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', details)
const notFound = (what = 'Không tìm thấy tài nguyên') => fail(404, 'NOT_FOUND', what)
const unauthorized = () => fail(401, 'UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này')
const forbidden = () => fail(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này')

const FAILURES = {
  400: () => fail(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ (giả lập)'),
  401: unauthorized,
  403: forbidden,
  404: () => notFound(),
  409: () => fail(409, 'CONFLICT', 'Xung đột dữ liệu (giả lập)'),
  500: () => fail(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống'),
}

const clone = (v) => structuredClone(v)
const nowIso = () => new Date().toISOString()
const newId = () => state.nextId++ // id số nguyên như backend thật
const isPositiveInt = (v) => Number.isSafeInteger(v) && v > 0
const blank = (v) => typeof v !== 'string' || v.trim() === ''

function delay(ms, signal) {
  if (!ms) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

// ----- Phân trang (cùng luật với api.md: page >= 1, 1 <= limit <= 50, mặc định 1 và 20) -----
function pageParams(query) {
  const page = query?.page === undefined ? 1 : Number(query.page)
  const limit = query?.limit === undefined ? 20 : Number(query.limit)
  const details = []
  if (!Number.isInteger(page) || page < 1) details.push({ field: 'page', message: 'Số trang page phải là số nguyên từ 1 đến 1000000' })
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) details.push({ field: 'limit', message: 'Giới hạn limit phải là số nguyên từ 1 đến 50' })
  return details.length ? { error: invalidAll(details) } : { page, limit }
}

function paginate(items, query, mapItem) {
  const p = pageParams(query)
  if (p.error) return p.error
  const start = (p.page - 1) * p.limit
  return ok(items.slice(start, start + p.limit).map(mapItem), { page: p.page, limit: p.limit, total: items.length })
}

// ----- Dựng đối tượng trả về -----
const dishRef = (dishId) => {
  const dish = DISHES.find((d) => d.id === dishId)
  return { id: dishId, name: dish?.name ?? 'Món ăn' }
}

function reactionCounts(postId, userId) {
  const map = state.reactions[postId] ?? {}
  const values = Object.values(map)
  return {
    like_count: values.filter((v) => v === 'like').length,
    dislike_count: values.filter((v) => v === 'dislike').length,
    my_reaction: userId ? map[userId] ?? null : null,
  }
}

const visibleComments = (postId) => state.comments.filter((c) => c.post_id === postId && !c.hidden)

function postSummary(post, userId) {
  const out = {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    created_at: post.created_at,
    status: post.status ?? 'PUBLISHED',
    dish: dishRef(post.dish_id),
    author: post.author,
    ingredient_count: post.ingredients.length,
    step_count: post.steps.length,
    comment_count: visibleComments(post.id).length,
    ...reactionCounts(post.id, userId),
  }
  if (post.restaurant) out.restaurant = post.restaurant
  return out
}

// Đúng contract GET /api/posts: chỉ id, title, created_at, dish, author (không content, không số lượng).
function contractListItem(post) {
  return { id: post.id, title: post.title, created_at: post.created_at, dish: dishRef(post.dish_id), author: post.author }
}

function postDetail(post, userId) {
  return { ...postSummary(post, userId), ingredients: post.ingredients, steps: post.steps }
}

function commentOut(c) {
  return { id: c.id, post_id: c.post_id, author: c.author, content: c.content, created_at: c.created_at, edited_at: c.edited_at }
}

function excerptOf(report) {
  const target = report.target_type === 'POST'
    ? state.posts.find((p) => p.id === report.target_id)
    : state.comments.find((c) => c.id === report.target_id)
  const text = target ? (target.title ?? target.content ?? '') : ''
  return text.length > 120 ? `${text.slice(0, 117)}…` : text
}

const reportOut = (report) => ({ ...report, excerpt: excerptOf(report) })

// Bài người dùng thấy được: đã đăng, chưa bị ẩn; bản nháp chỉ chủ bài thấy.
function findVisiblePost(id, userId) {
  const post = state.posts.find((p) => p.id === id)
  if (!post || post.hidden) return null
  if ((post.status ?? 'PUBLISHED') === 'DRAFT' && post.author.id !== userId) return null
  return post
}

// ----- Kiểm tra dữ liệu bài đăng (theo bảng Validation trong api.md) -----
function validatePost(body) {
  const details = []
  const bad = (field, message) => details.push({ field, message })
  if (!isPositiveInt(body?.dish_id)) bad('dish_id', 'Mã món ăn (dish_id) phải là số nguyên dương')
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (title.length < 3 || title.length > 150) bad('title', 'Tiêu đề bài viết phải có từ 3 đến 150 ký tự')
  if (body?.content != null && (typeof body.content !== 'string' || body.content.length > 2000)) bad('content', 'Nội dung bài viết không được vượt quá 2000 ký tự')
  const ingredients = body?.ingredients
  if (!Array.isArray(ingredients) || ingredients.length < 1) bad('ingredients', 'Bài viết phải có ít nhất 1 nguyên liệu')
  else if (ingredients.length > 50) bad('ingredients', 'Bài viết không được có quá 50 nguyên liệu')
  else {
    ingredients.forEach((item, i) => {
      if (item?.ingredient_id != null && !isPositiveInt(item.ingredient_id)) bad(`ingredients[${i}].ingredient_id`, 'Mã nguyên liệu phải là số nguyên dương')
      if (blank(item?.name) && item?.ingredient_id == null) bad(`ingredients[${i}].name`, 'Nguyên liệu phải có ít nhất một trong hai: ingredient_id hoặc name')
      if (item?.quantity != null && !(typeof item.quantity === 'number' && item.quantity > 0)) bad(`ingredients[${i}].quantity`, 'Định lượng phải là số lớn hơn 0')
      if (item?.unit != null && (typeof item.unit !== 'string' || item.unit.length < 1 || item.unit.length > 30)) bad(`ingredients[${i}].unit`, 'Đơn vị phải có từ 1 đến 30 ký tự')
    })
  }
  const steps = body?.steps
  if (!Array.isArray(steps) || steps.length < 1) bad('steps', 'Bài viết phải có ít nhất 1 bước thực hiện')
  else if (steps.length > 50) bad('steps', 'Bài viết không được có quá 50 bước thực hiện')
  else {
    steps.forEach((step, i) => {
      if (blank(step?.content)) bad(`steps[${i}].content`, 'Nội dung bước nấu không được để trống')
      else if (step.content.length > 1000) bad(`steps[${i}].content`, 'Nội dung bước nấu không được vượt quá 1000 ký tự')
    })
  }
  return details
}

function postFields(body) {
  return {
    title: body.title.trim(),
    content: typeof body.content === 'string' && body.content.trim() ? body.content.trim() : body.title.trim(),
    dish_id: body.dish_id,
    status: body.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
    ingredients: body.ingredients.map((i) => ({
      ingredient_id: i.ingredient_id ?? newId(), name: (i.name ?? '').trim(), quantity: i.quantity ?? null, unit: i.unit ?? null,
      role: i.role === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY',
    })),
    steps: body.steps.map((s, idx) => ({ order: idx + 1, content: s.content.trim() })),
  }
}

// ----- Bảng route -----
// Mỗi route: [method, mẫu đường dẫn, handler(ctx)]. ctx: { params, query, body, session, userId }.
const routes = [
  ['GET', '/dishes/:id', ({ params }) => {
    const dish = DISHES.find((d) => d.id === params.id)
    return dish ? ok({ id: dish.id, name: dish.name }) : notFound('Không tìm thấy món ăn')
  }],
  ['GET', '/dishes/:id/recipes', ({ params, query }) => {
    if (!DISHES.some((d) => d.id === params.id)) return notFound('Không tìm thấy món ăn')
    const items = RECIPES.filter((r) => r.dish_id === params.id)
    return paginate(items, query, (r) => ({ id: r.id, dish_id: r.dish_id, name: r.name, prep_time_minutes: r.prep_time_minutes, ingredient_count: r.ingredients.length, incomplete: r.incomplete }))
  }],
  ['GET', '/recipes/:id', ({ params }) => {
    const recipe = RECIPES.find((r) => r.id === params.id)
    return recipe ? ok(clone(recipe)) : notFound('Không tìm thấy công thức')
  }],

  ['GET', '/posts', ({ query, userId }) => {
    const type = query?.type ?? 'RECIPE'
    const q = (query?.q ?? '').trim().toLowerCase()
    const items = state.posts
      .filter((p) => !p.hidden && (p.status ?? 'PUBLISHED') === 'PUBLISHED' && p.type === type)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || dishRef(p.dish_id).name.toLowerCase().includes(q))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return paginate(items, query, (p) => (p.type === 'RECIPE' ? contractListItem(p) : postSummary(p, userId)))
  }],
  ['GET', '/posts/:id', ({ params, userId }) => {
    const post = findVisiblePost(params.id, userId)
    return post ? ok(postDetail(post, userId)) : notFound('Không tìm thấy bài viết')
  }],
  ['POST', '/posts', ({ body, session, userId }) => {
    if (!session) return unauthorized()
    const details = validatePost(body)
    if (details.length) return invalidAll(details)
    const post = {
      id: newId(), type: 'RECIPE', created_at: nowIso(),
      author: { id: userId, display_name: session.displayName || 'Bạn' },
      ...postFields(body),
    }
    state.posts.push(post)
    return created(postDetail(post, userId))
  }],
  ['PATCH', '/posts/:id', ({ params, body, session, userId }) => {
    if (!session) return unauthorized()
    const post = state.posts.find((p) => p.id === params.id)
    if (!post || post.hidden) return notFound('Không tìm thấy bài viết')
    if (post.author.id !== userId) return forbidden()
    const merged = { dish_id: post.dish_id, title: post.title, content: post.content, ingredients: post.ingredients, steps: post.steps, status: post.status, ...body }
    const details = validatePost(merged)
    if (details.length) return invalidAll(details)
    Object.assign(post, postFields(merged), { updated_at: nowIso() })
    return ok(postDetail(post, userId))
  }],
  ['DELETE', '/posts/:id', ({ params, session, userId }) => {
    if (!session) return unauthorized()
    const post = state.posts.find((p) => p.id === params.id)
    if (!post || post.hidden) return notFound('Không tìm thấy bài viết')
    if (post.author.id !== userId) return forbidden()
    state.posts = state.posts.filter((p) => p.id !== post.id)
    return noContent()
  }],
  ['GET', '/me/drafts', ({ query, session, userId }) => {
    if (!session) return unauthorized()
    const items = state.posts
      .filter((p) => !p.hidden && p.status === 'DRAFT' && p.author.id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return paginate(items, query, (p) => postSummary(p, userId))
  }],

  ['PUT', '/posts/:id/reaction', ({ params, body, session, userId }) => {
    if (!session) return unauthorized()
    const post = findVisiblePost(params.id, userId)
    if (!post) return notFound('Không tìm thấy bài viết')
    const value = body?.value
    if (value !== null && value !== 'like' && value !== 'dislike') return invalid('value', 'Giá trị phải là like, dislike hoặc null')
    const map = (state.reactions[post.id] ??= {})
    if (value === null) delete map[userId]
    else map[userId] = value
    const { like_count, dislike_count, my_reaction } = reactionCounts(post.id, userId)
    return ok({ my_reaction, like_count, dislike_count })
  }],

  ['GET', '/posts/:id/comments', ({ params, query, userId }) => {
    if (!findVisiblePost(params.id, userId)) return notFound('Không tìm thấy bài viết')
    const items = visibleComments(params.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
    return paginate(items, query, commentOut)
  }],
  ['POST', '/posts/:id/comments', ({ params, body, session, userId }) => {
    if (!session) return unauthorized()
    if (!findVisiblePost(params.id, userId)) return notFound('Không tìm thấy bài viết')
    if (blank(body?.content)) return invalid('content', 'Bình luận không được để trống')
    if (body.content.length > 1000) return invalid('content', 'Bình luận không được vượt quá 1000 ký tự')
    const comment = {
      id: newId(), post_id: params.id, author: { id: userId, display_name: session.displayName || 'Bạn' },
      content: body.content.trim(), created_at: nowIso(), edited_at: null,
    }
    state.comments.push(comment)
    return created(commentOut(comment))
  }],
  ['PATCH', '/comments/:id', ({ params, body, session, userId }) => {
    if (!session) return unauthorized()
    const comment = state.comments.find((c) => c.id === params.id && !c.hidden)
    if (!comment) return notFound('Không tìm thấy bình luận')
    if (comment.author.id !== userId) return forbidden()
    if (blank(body?.content)) return invalid('content', 'Bình luận không được để trống')
    if (body.content.length > 1000) return invalid('content', 'Bình luận không được vượt quá 1000 ký tự')
    comment.content = body.content.trim()
    comment.edited_at = nowIso()
    return ok(commentOut(comment))
  }],
  ['DELETE', '/comments/:id', ({ params, session, userId }) => {
    if (!session) return unauthorized()
    const comment = state.comments.find((c) => c.id === params.id && !c.hidden)
    if (!comment) return notFound('Không tìm thấy bình luận')
    if (comment.author.id !== userId) return forbidden()
    state.comments = state.comments.filter((c) => c.id !== comment.id)
    return noContent()
  }],

  ['POST', '/reports', ({ body, session, userId }) => {
    if (!session) return unauthorized()
    const targetType = body?.target_type
    if (targetType !== 'POST' && targetType !== 'COMMENT') return invalid('target_type', 'Loại nội dung phải là POST hoặc COMMENT')
    if (!isPositiveInt(body?.target_id)) return invalid('target_id', 'target_id phải là số nguyên dương')
    if (blank(body?.reason)) return invalid('reason', 'Phải chọn lý do báo cáo')
    const exists = targetType === 'POST'
      ? state.posts.some((p) => p.id === body.target_id)
      : state.comments.some((c) => c.id === body.target_id)
    if (!exists) return notFound('Không tìm thấy nội dung bị báo cáo')
    const key = `${userId}|${targetType}|${body.target_id}`
    if (state.reportedBy.has(key)) return fail(409, 'CONFLICT', 'Bạn đã báo cáo nội dung này')
    state.reportedBy.add(key)
    const pending = state.reports.find((r) => r.target_type === targetType && r.target_id === body.target_id && r.status === 'PENDING')
    if (pending) pending.report_count += 1
    else {
      state.reports.push({
        id: newId(), target_type: targetType, target_id: body.target_id, reason: body.reason.trim(),
        report_count: 1, created_at: nowIso(), status: 'PENDING', resolution: null,
      })
    }
    return created({ target_type: targetType, target_id: body.target_id })
  }],

  // Mock coi mọi người đã đăng nhập là quản trị viên. Để thử nhánh 403 dùng __citrusMock.failNext(403).
  ['GET', '/admin/reports', ({ query, session }) => {
    if (!session) return unauthorized()
    const status = query?.status
    if (status !== undefined && status !== 'PENDING' && status !== 'RESOLVED') return invalid('status', 'Trạng thái phải là PENDING hoặc RESOLVED')
    const items = state.reports.filter((r) => !status || r.status === status).sort((a, b) => b.created_at.localeCompare(a.created_at))
    return paginate(items, query, reportOut)
  }],
  ['POST', '/admin/content/:type/:id/hide', ({ params, body, session }) => {
    if (!session) return unauthorized()
    if (params.type !== 'posts' && params.type !== 'comments') return notFound()
    if (blank(body?.reason)) return invalid('reason', 'Phải nhập lý do ẩn nội dung')
    const list = params.type === 'posts' ? state.posts : state.comments
    const target = list.find((item) => item.id === params.id)
    if (!target) return notFound('Không tìm thấy nội dung')
    target.hidden = true
    const targetType = params.type === 'posts' ? 'POST' : 'COMMENT'
    const resolution = { handled_by: session.displayName || 'Quản trị viên', handled_at: nowIso(), reason: body.reason.trim() }
    const related = state.reports.filter((r) => r.target_type === targetType && r.target_id === params.id)
    if (!related.length) {
      related.push({
        id: newId(), target_type: targetType, target_id: params.id, reason: 'Ẩn trực tiếp bởi quản trị viên',
        report_count: 0, created_at: nowIso(), status: 'PENDING', resolution: null,
      })
      state.reports.push(related[0])
    }
    for (const r of related) { r.status = 'RESOLVED'; r.resolution = resolution }
    return ok(reportOut(related[0]))
  }],
]

const compiled = routes.map(([method, pattern, handler]) => ({
  method,
  handler,
  keys: [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]),
  regex: new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`),
}))

export async function handleMockRequest({ method, path, query, body, session, signal }) {
  await delay(options.latencyMs, signal)
  if (failNextStatus !== null) {
    const status = failNextStatus
    failNextStatus = null
    return (FAILURES[status] ?? FAILURES[500])()
  }
  for (const route of compiled) {
    if (route.method !== method) continue
    const match = route.regex.exec(path)
    if (!match) continue
    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]))
    // Contract: :id phải là số nguyên dương, ngược lại 400 VALIDATION_ERROR.
    if ('id' in params) {
      if (!/^[1-9]\d{0,14}$/.test(params.id)) return invalid('id', 'Định danh (id) phải là số nguyên dương')
      params.id = Number(params.id)
    }
    const result = route.handler({ params, query, body: body === undefined ? undefined : clone(body), session, userId: session?.userId ?? null })
    return { status: result.status, body: result.body === null ? null : clone(result.body) }
  }
  return notFound('Endpoint không tồn tại')
}
