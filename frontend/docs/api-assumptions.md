# Giả định API của Frontend (gửi TV1 đối chiếu)

Tài liệu này liệt kê những chỗ Frontend **đang giả định** hoặc thấy **lệch** so với contract chính thức (`docs/api.md` của TV1, nhánh `huong/feature/BE04-get-posts`, đọc ngày 11/11/2026). Không mục nào ở đây được coi là đã chốt. Khi một endpoint được backend merge và khớp, đánh dấu "đã khớp" ở cột Trạng thái.

Quy ước Frontend đang theo: ID là chuỗi opaque, thời gian ISO 8601 UTC, `snake_case`, thành công `{ data }` / `{ data: [...], meta: { page, limit, total } }`, lỗi `{ error: { code, message, details?: [{ field, message }] } }`.

Toàn bộ chỗ gọi API nằm trong `src/lib/api/`; chỉ `mappers.js` biết tên trường. Nếu contract đổi, chỉ sửa `mappers.js` và service tương ứng.

## 1. Chỗ code backend thật lệch với `docs/api.md` (cần TV1 xác nhận)

Phát hiện khi đọc code nhánh BE04 (`schemas/posts.schema.js`, `posts.service.js`, `app.js`, `routes/`).

| # | Tài liệu `api.md` ghi | Code nhánh BE04 | Frontend đang làm |
|---|---|---|---|
| 1 | ID là UUID v4 (mục 2, câu hỏi mở 1) | `postIdParamSchema` và `positiveInt` yêu cầu ID là **số nguyên dương** (`dish_id`, `ingredient_id`, `:id`) | Coi ID là chuỗi/số bất kỳ, không ép kiểu, không kiểm tra định dạng. Cần TV1 chốt UUID hay số. Nếu là số, `dish_id` gửi lên phải là số, không phải chuỗi |
| 2 | Body `POST /api/posts` không có `content` | Schema nhận `content` (tối đa 2000 ký tự, tùy chọn), truyền vào RPC `p_content` | Gửi `content` khi người dùng nhập. Response `GET` chưa chắc trả `content` lại |
| 3 | Không có `role` ở nguyên liệu | Schema nhận `ingredients[].role` (`PRIMARY` / `SECONDARY`) | Không gửi |
| 4 | Bài chưa có `status` (câu hỏi mở 3) | Danh sách chỉ lấy `RECIPE` + `PUBLIC` qua RPC `get_public_posts` | Giả định có `type` và `status` (xem mục 2) |
| 5 | Lỗi trùng nguyên liệu: không nhắc | `ingredients` trùng trả 400 với `details[].field = "ingredients[n]"` hoặc `"ingredients"` | `fields` đọc được theo đường dẫn đó; form FE05 sẽ hiện lỗi dưới danh sách nguyên liệu |
| 6 | `GET /api/dishes` phụ trách TV4 (BE05) | `routes/dishes.routes.js` trên BE04 **còn trống** (chỉ có chú thích TODO) | `dishes.list` luôn gọi API thật, đọc cả mảng thuần (main) lẫn `{ data, meta }`. `search`, `page`, `limit` được gửi lên nhưng main bỏ qua |
| 7 | Có `GET /api/me`? Không có trong `api.md` | Nhánh BE04 **không có** `/api/me`; chỉ `main` có | `me.get` gọi `GET /api/me` thật. Khi BE04 merge vào `main`, cần giữ route này (AuthProvider phụ thuộc: 403 = tài khoản khóa, 409 = thiếu hồ sơ) |
| 8 | `/api/me` trả cột DB (`ten_hien_thi`, `vai_tro`, `trang_thai`, `anh_dai_dien`) và lỗi dạng chuỗi trên `main` | Nhánh BE04 dùng lỗi `{ error: { code, message } }` | Frontend đọc cả hai dạng. Đề nghị đưa `/api/me` về contract (`{ data: { id, display_name, avatar_url, role, status } }`) khi hợp nhất; khi đó chỉ cần sửa `services/me.js` và nơi đọc `profile` |
| 9 | Base URL dev `http://localhost:4000` (mục 2) | `env.js` mặc định `PORT=3000` | `vite.config.js` đang proxy `/api` tới cổng 3000 |
| 10 | Header CORS | `allowedHeaders: ['Authorization', 'Content-Type']`, origin lạ trả 403 | Đủ cho Frontend. Production cần thêm origin Vercel vào `CORS_ORIGINS` |
| 11 | Backend `main` chạy bằng `SUPABASE_SERVICE_ROLE_KEY`; nhánh BE04 dùng `SUPABASE_ANON_KEY` | Hai bộ biến `.env` khác nhau | Chỉ ghi nhận để TV1/TV5 thống nhất khi merge; Frontend không bị ảnh hưởng |

## 2. Chỗ contract thật khác kế hoạch ban đầu (mục 5.2 của kế hoạch)

| Thiếu trong contract | Frontend giả định | Dùng cho | Trạng thái |
|---|---|---|---|
| Bài không có `type` (công thức / đánh giá quán) | `type`: `RECIPE` \| `REVIEW`. `GET /api/posts?type=` (mặc định `RECIPE`). Thiếu `type` thì Frontend coi là `RECIPE` | FE07 hai tab | Giả định, qua mock |
| Bài không có `status` (nháp) | `status`: `DRAFT` \| `PUBLISHED`; `POST /api/posts` nhận `status`. Bản nháp chỉ chủ bài thấy | FE07 P1 (G5) | Giả định, qua mock |
| Bài không có `content` trong response | `content` (chuỗi, có thể rỗng) ở list và detail | Đoạn trích trên card | Giả định (BE04 có nhận `content` khi tạo, xem mục 1 #2) |
| Không có tìm theo từ khóa | `GET /api/posts?q=` (khớp tiêu đề hoặc tên món) | FE07 tìm bài | Giả định, qua mock |
| List chưa có số nguyên liệu, số bước | `ingredient_count`, `step_count`. Nếu list trả `ingredients[]`/`steps[]` thì Frontend tự đếm | Card bài (FE04) | Giả định. Nếu không có, card sẽ ẩn hai số này hoặc cần đổi list |
| Không có số cảm xúc, bình luận | `like_count`, `dislike_count`, `comment_count`, `my_reaction` (`like` \| `dislike` \| `null`, chỉ có khi gửi token) ở list và detail | FE07 | Giả định, qua mock |
| Bài đánh giá quán | `restaurant: { name, address, price_range }` (chỉ khi `type = REVIEW`) | FE07 `ReviewPostCard` | Giả định, qua mock. Form đăng bài đánh giá ngoài phạm vi Sprint 2 |
| Nguyên liệu không có cờ "tùy khẩu vị" | `quantity: null` = Tùy khẩu vị (đã khớp contract, G7) | FE04, FE05 | Khớp contract |
| Vai trò quản trị viên | `vai_tro = 'ADMIN'` (đã xác nhận bằng CHECK constraint, G8) | RequireRole, huy hiệu | Đã chốt |

## 3. Endpoint chưa có trong contract (Frontend giả định, chạy qua mock)

Tất cả gọi qua `request(..., { mockable: true })`: khi `VITE_USE_MOCK=true` (chỉ dev) dùng bộ giả lập `src/lib/api/mock/`, ngược lại gọi backend thật.

| Phương thức, đường dẫn | Đăng nhập | Body / query | Response thành công | Lỗi Frontend xử lý | Service |
|---|---|---|---|---|---|
| `GET /api/dishes/:id` | Không | | `{ data: { id, name } }` | 404 | `dishes.get` |
| `GET /api/dishes/:id/recipes` | Không | `page`, `limit` | `{ data: [{ id, dish_id, name, prep_time_minutes, ingredient_count, incomplete }], meta }`. Món chưa có công thức: `data: []` | 404 nếu món không tồn tại | `recipes.listByDish` |
| `GET /api/recipes/:id` | Không | | `{ data: { id, dish_id, name, prep_time_minutes, incomplete, ingredients[], steps[{ order, content }] } }` (ingredient cùng dạng contract bài đăng) | 404 | `recipes.get` |
| `PATCH /api/posts/:id` | Có, chỉ tác giả | Như `POST /api/posts` (các trường tùy chọn) | `{ data: <bài chi tiết> }` | 400, 403 (không phải tác giả), 404 | `posts.update` |
| `DELETE /api/posts/:id` | Có, chỉ tác giả | | `204` không có body | 403, 404 | `posts.remove` |
| `GET /api/me/drafts` | Có | `page`, `limit` | `{ data: [<bài tóm tắt>], meta }` | 401 | `posts.listDrafts` |
| `PUT /api/posts/:id/reaction` | Có | `{ value: "like" \| "dislike" \| null }` (`null` = bỏ chọn) | `{ data: { my_reaction, like_count, dislike_count } }` | 400, 401, 404 | `reactions.set` |
| `GET /api/posts/:id/comments` | Không | `page`, `limit` (cũ nhất trước) | `{ data: [{ id, post_id, author{id,display_name}, content, created_at, edited_at }], meta }` | 404 | `comments.list` |
| `POST /api/posts/:id/comments` | Có | `{ content }` (1–1000 ký tự, không chỉ khoảng trắng) | `201 { data: <bình luận> }` | 400, 401, 404 | `comments.create` |
| `PATCH /api/comments/:id` | Có, chỉ tác giả | `{ content }` | `{ data: <bình luận> }`, `edited_at` được đặt | 400, 403, 404 | `comments.update` |
| `DELETE /api/comments/:id` | Có, chỉ tác giả | | `204` | 403, 404 | `comments.remove` |
| `POST /api/reports` | Có | `{ target_type: "POST" \| "COMMENT", target_id, reason }` | `201 { data: { target_type, target_id } }` | 400, 404, **409** nếu người này đã báo cáo nội dung đó | `reports.create` |
| `GET /api/admin/reports` | Quản trị viên | `status` (`PENDING` \| `RESOLVED`), `page`, `limit` | `{ data: [{ id, target_type, target_id, excerpt, reason, report_count, created_at, status, resolution: { handled_by, handled_at, reason } \| null }], meta }`. `excerpt` có cả khi nội dung đã bị ẩn | 401, 403 | `admin.listReports` |
| `POST /api/admin/content/:type/:id/hide` | Quản trị viên | `type` = `posts` \| `comments`; body `{ reason }` (bắt buộc) | `{ data: <báo cáo đã xử lý> }` | 400 (thiếu lý do), 403, 404 | `admin.hideContent` |

Quy tắc kèm theo mà Frontend giả định:

- Nội dung bị ẩn hoặc xóa: `GET /api/posts/:id` trả **404** (Frontend hiện "Bài viết không còn khả dụng"), và bài không xuất hiện ở danh sách (QĐ 3.3).
- Bản nháp: chỉ chủ bài thấy qua `GET /api/posts/:id`; người khác nhận 404.
- Backend phải tự kiểm tra quyền tác giả và quản trị viên (NFR03); Frontend chỉ ẩn/chặn để tiện dùng.
- Bình luận đã sửa có `edited_at` khác `null`.
- Báo cáo trùng trả 409 (mã `CONFLICT`); Frontend hiện "Bạn đã báo cáo nội dung này."

## 4. Hành vi của bộ giả lập cần biết (không phải yêu cầu với backend)

- Chỉ nạp khi `import.meta.env.DEV` và `VITE_USE_MOCK === 'true'`. Dữ liệu nằm trong bộ nhớ, mất khi tải lại trang.
- `GET /api/dishes` và `GET /api/me` **không bao giờ** đi qua mock. Vì vậy `dish_id` mà form tạo bài gửi lên mock là ID món thật (từ DB), mock chấp nhận ID lạ và hiển thị tên món là "Món ăn" nếu không khớp 5 món mẫu.
- Mọi người đã đăng nhập đều được mock coi là quản trị viên ở `/api/admin/*`. Thử nhánh 403 bằng `__citrusMock.failNext(403)` trong console trình duyệt (có `failNext(400|401|403|404|409|500)`, `reset()`, `configure({ latencyMs })`). Độ trễ mặc định 300 ms.
- Dữ liệu mẫu: 7 bài công thức hiển thị và 1 bài bị ẩn (gắn với 5 món trong `supabase/seed.sql`), 4 bài đánh giá quán, 4 bình luận (1 đã sửa), cảm xúc, 3 báo cáo, 5 công thức theo món (1 công thức thiếu bước, 1 món chưa có công thức).

## 5. Câu hỏi cho TV1 (và TV3, TV4 nếu liên quan)

1. ID là UUID hay số nguyên? (mục 1 #1; ảnh hưởng `dish_id`, `ingredient_id`, `:id`.)
2. `content` của bài có nằm trong response `GET /api/posts` và `GET /api/posts/:id` không, và có bắt buộc không? (FE05 cần biết có bắt buộc nhập nội dung hay không, QĐ 3.2.)
3. Sprint 2 có `type`, `status`, `q`, số lượng cảm xúc/bình luận trong `GET /api/posts` không, hay Frontend phải tự lọc/đếm?
4. Có sẵn kế hoạch cho bình luận, cảm xúc, báo cáo, quản trị (mục 3)? Ai phụ trách?
5. `GET /api/me` sẽ giữ lỗi 403 (khóa) và 409 (thiếu hồ sơ) sau khi hợp nhất với nhánh BE04?
