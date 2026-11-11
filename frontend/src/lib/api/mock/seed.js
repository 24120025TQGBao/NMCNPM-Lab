// Dữ liệu mẫu cho bộ giả lập (chỉ nạp khi DEV và VITE_USE_MOCK=true).
// Năm món lấy từ supabase/seed.sql. ID là UUID giả theo contract (api.md ghi UUID v4).
// Chuỗi đặc trưng để kiểm tra bản build production không chứa mock: 'Phở Thìn' (tên quán mẫu bên dưới).

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const DISHES = [
  { id: uid(101), name: 'Phở bò', description: 'Món phở truyền thống Việt Nam' },
  { id: uid(102), name: 'Bún bò Huế', description: 'Món bún đặc trưng của Huế' },
  { id: uid(103), name: 'Cơm tấm', description: 'Cơm tấm với sườn nướng' },
  { id: uid(104), name: 'Bánh mì', description: 'Bánh mì Việt Nam' },
  { id: uid(105), name: 'Bún thịt nướng', description: 'Bún với thịt nướng và rau' },
]

export const USERS = {
  minh: { id: uid(201), display_name: 'Minh' },
  lan: { id: uid(202), display_name: 'Lan Anh' },
  hung: { id: uid(203), display_name: 'Hùng' },
  thao: { id: uid(204), display_name: 'Thảo' },
}

const ing = (name, quantity = null, unit = null) => ({ ingredient_id: null, name, quantity, unit })
const steps = (...items) => items.map((content, i) => ({ order: i + 1, content }))
const day = (d, h = 9) => new Date(Date.UTC(2026, 10, d, h, 30)).toISOString()

// type 'RECIPE' | 'REVIEW'; status 'PUBLISHED' | 'DRAFT'; hidden: bài bị quản trị viên ẩn (GET trả 404).
export const POSTS = [
  {
    id: uid(1), type: 'RECIPE', title: 'Phở bò nhà làm, nước dùng trong', content: 'Nước dùng ngọt thanh từ xương ống.',
    dish_id: DISHES[0].id, author: USERS.minh, created_at: day(6),
    ingredients: [ing('xương bò', 1, 'kg'), ing('hành tây', 2, 'củ'), ing('gừng', 1, 'củ'), ing('muối')],
    steps: steps('Chần xương với nước sôi 5 phút rồi rửa sạch.', 'Hầm xương 3 tiếng với hành, gừng nướng.', 'Nêm nếm vừa ăn, lọc nước dùng cho trong.'),
  },
  {
    id: uid(2), type: 'RECIPE', title: 'Phở bò tái chín cho bữa sáng', content: '',
    dish_id: DISHES[0].id, author: USERS.lan, created_at: day(7),
    ingredients: [ing('bánh phở', 400, 'g'), ing('thịt bò tái', 200, 'g'), ing('hành lá')],
    steps: steps('Trụng bánh phở.', 'Xếp thịt bò lên trên rồi chan nước dùng sôi.'),
  },
  {
    id: uid(3), type: 'RECIPE', title: 'Bún bò Huế cay đúng vị', content: 'Dùng sả đập dập và mắm ruốc.',
    dish_id: DISHES[1].id, author: USERS.hung, created_at: day(7, 14),
    ingredients: [ing('giò heo', 500, 'g'), ing('sả', 5, 'cây'), ing('mắm ruốc', 2, 'muỗng'), ing('ớt bột')],
    steps: steps('Ninh giò heo với sả.', 'Phi hành với ớt bột và mắm ruốc rồi cho vào nồi.', 'Chan nước dùng lên bún.'),
  },
  {
    id: uid(4), type: 'RECIPE', title: 'Cơm tấm sườn nướng mật ong', content: 'Sườn ướp qua đêm.',
    dish_id: DISHES[2].id, author: USERS.thao, created_at: day(8),
    ingredients: [ing('sườn cốt lết', 4, 'miếng'), ing('mật ong', 2, 'muỗng'), ing('tỏi băm', 1, 'muỗng'), ing('nước mắm')],
    steps: steps('Ướp sườn với mật ong, tỏi và nước mắm.', 'Nướng than hoa mỗi mặt 5 phút.', 'Dọn cùng cơm tấm và đồ chua.'),
  },
  {
    id: uid(5), type: 'RECIPE', title: 'Bánh mì trứng ốp la giòn rụm', content: '',
    dish_id: DISHES[3].id, author: USERS.minh, created_at: day(8, 15),
    ingredients: [ing('bánh mì', 2, 'ổ'), ing('trứng', 2, 'quả'), ing('pate'), ing('rau mùi')],
    steps: steps('Nướng giòn bánh mì.', 'Ốp trứng lòng đào.', 'Phết pate và kẹp trứng.'),
  },
  {
    id: uid(6), type: 'RECIPE', title: 'Bún thịt nướng sả ớt', content: 'Nước mắm chua ngọt pha sẵn.',
    dish_id: DISHES[4].id, author: USERS.lan, created_at: day(9),
    ingredients: [ing('thịt heo', 500, 'g'), ing('sả', 3, 'cây'), ing('bún', 400, 'g'), ing('đường', 1, 'muỗng')],
    steps: steps('Ướp thịt với sả và đường.', 'Nướng đến khi xém cạnh.', 'Bày bún, rau sống, thịt nướng và chan nước mắm.'),
  },
  {
    id: uid(7), type: 'RECIPE', title: 'Cơm tấm bì chả trứng hấp', content: '',
    dish_id: DISHES[2].id, author: USERS.hung, created_at: day(10),
    ingredients: [ing('bì heo', 200, 'g'), ing('trứng', 3, 'quả'), ing('thính gạo')],
    steps: steps('Trộn bì với thính.', 'Đánh trứng với nấm mèo rồi hấp 20 phút.'),
  },
  {
    // Bài bị ẩn (QĐ 3.3): không xuất hiện ở danh sách, GET theo id trả 404.
    id: uid(8), type: 'RECIPE', title: 'Bài công thức đã bị ẩn', content: 'Nội dung vi phạm quy định.',
    dish_id: DISHES[0].id, author: USERS.thao, created_at: day(5), hidden: true,
    ingredients: [ing('nước')], steps: steps('Bước mẫu.'),
  },
  {
    id: uid(21), type: 'REVIEW', title: 'Phở Thìn: nước dùng đậm, thịt bò xào lửa lớn', content: 'Đông khách giờ cao điểm, nên đi sớm.',
    restaurant: { name: 'Phở Thìn', address: '13 Lò Đúc, Hai Bà Trưng', price_range: '50.000–80.000đ' },
    dish_id: DISHES[0].id, author: USERS.lan, created_at: day(9, 7), ingredients: [], steps: [],
  },
  {
    id: uid(22), type: 'REVIEW', title: 'Bún bò Huế O Hà: cay vừa, giò to', content: 'Phục vụ nhanh, chỗ ngồi hơi chật.',
    restaurant: { name: 'Bún bò O Hà', address: '45 Nguyễn Trãi, Quận 1', price_range: '40.000–70.000đ' },
    dish_id: DISHES[1].id, author: USERS.minh, created_at: day(9, 12), ingredients: [], steps: [],
  },
  {
    id: uid(23), type: 'REVIEW', title: 'Cơm tấm Ba Ghiền: sườn dày, mỡ hành thơm', content: 'Xếp hàng khoảng 15 phút.',
    restaurant: { name: 'Cơm tấm Ba Ghiền', address: '84 Đặng Văn Ngữ, Phú Nhuận', price_range: '60.000–100.000đ' },
    dish_id: DISHES[2].id, author: USERS.hung, created_at: day(10, 11), ingredients: [], steps: [],
  },
  {
    id: uid(24), type: 'REVIEW', title: 'Bánh mì Huỳnh Hoa: nhân đầy, hơi nhiều pate', content: '',
    restaurant: { name: 'Bánh mì Huỳnh Hoa', address: '26 Lê Thị Riêng, Quận 1', price_range: '55.000–75.000đ' },
    dish_id: DISHES[3].id, author: USERS.thao, created_at: day(10, 16), ingredients: [], steps: [],
  },
]

// Cảm xúc ban đầu: postId -> { userId: 'like' | 'dislike' }
export const REACTIONS = {
  [uid(1)]: { [USERS.lan.id]: 'like', [USERS.hung.id]: 'like', [USERS.thao.id]: 'dislike' },
  [uid(3)]: { [USERS.minh.id]: 'like' },
  [uid(4)]: { [USERS.minh.id]: 'like', [USERS.lan.id]: 'like' },
  [uid(21)]: { [USERS.hung.id]: 'like' },
}

export const COMMENTS = [
  { id: uid(301), post_id: uid(1), author: USERS.lan, content: 'Mình làm theo và nước dùng rất trong, cảm ơn bạn!', created_at: day(7, 8), edited_at: null },
  { id: uid(302), post_id: uid(1), author: USERS.hung, content: 'Có thể thay xương ống bằng xương đuôi không?', created_at: day(7, 10), edited_at: day(7, 11) },
  { id: uid(303), post_id: uid(4), author: USERS.minh, content: 'Sườn ướp qua đêm đúng là khác hẳn.', created_at: day(9, 9), edited_at: null },
  { id: uid(304), post_id: uid(21), author: USERS.thao, content: 'Đã thử, đồng ý với đánh giá này.', created_at: day(10, 9), edited_at: null },
]

// Báo cáo ban đầu (cho màn hình quản trị): bài bị ẩn đã được xử lý, một bình luận đang chờ.
export const REPORTS = [
  {
    id: uid(401), target_type: 'POST', target_id: uid(8), reason: 'Nội dung không phù hợp', report_count: 3,
    created_at: day(6, 8), status: 'RESOLVED',
    resolution: { handled_by: 'Quản trị viên', handled_at: day(6, 10), reason: 'Vi phạm quy định cộng đồng' },
  },
  { id: uid(402), target_type: 'COMMENT', target_id: uid(302), reason: 'Spam', report_count: 1, created_at: day(10, 8), status: 'PENDING', resolution: null },
  { id: uid(403), target_type: 'POST', target_id: uid(7), reason: 'Sai thông tin công thức', report_count: 2, created_at: day(10, 13), status: 'PENDING', resolution: null },
]

// Công thức theo món (GET /dishes/:id/recipes, /recipes/:id). Một công thức cố ý thiếu bước (QĐ 4.4).
const rec = (n, dish, name, prep, ingredients, stepList, incomplete = false) => ({
  id: uid(500 + n), dish_id: dish.id, name, prep_time_minutes: prep, incomplete, ingredients, steps: steps(...stepList),
})
export const RECIPES = [
  rec(1, DISHES[0], 'Phở bò truyền thống', 180, [ing('xương bò', 1, 'kg'), ing('bánh phở', 400, 'g'), ing('hành tây', 2, 'củ')], ['Hầm xương.', 'Trụng bánh phở.', 'Chan nước dùng.']),
  rec(2, DISHES[0], 'Phở bò nấu nhanh', 45, [ing('nước dùng đóng gói', 1, 'lít'), ing('thịt bò', 200, 'g')], ['Đun nước dùng.', 'Nhúng thịt bò.']),
  rec(3, DISHES[1], 'Bún bò Huế', 120, [ing('giò heo', 500, 'g'), ing('sả', 5, 'cây'), ing('mắm ruốc')], ['Ninh giò heo.', 'Phi sả với mắm ruốc.']),
  rec(4, DISHES[2], 'Cơm tấm sườn nướng', 60, [ing('sườn', 4, 'miếng'), ing('gạo tấm', 300, 'g')], ['Ướp và nướng sườn.', 'Nấu cơm tấm.']),
  rec(5, DISHES[3], 'Bánh mì trứng', 15, [ing('bánh mì', 2, 'ổ'), ing('trứng', 2, 'quả')], [], true),
]
