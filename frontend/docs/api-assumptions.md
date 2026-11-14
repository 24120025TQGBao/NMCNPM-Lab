# Giả định API của Frontend (gửi TV1 đối chiếu)

Tài liệu này liệt kê những chỗ Frontend **đang giả định** hoặc thấy **lệch** so với contract chính thức (`docs/api.md` v1.0 của TV1, đối chiếu với `origin/sprint1-integration` ngày 14/11/2026). Không mục nào ở mục 3 và 4 được coi là đã chốt. Khi một endpoint được backend merge và khớp, đánh dấu "đã khớp".

Quy ước Frontend đang theo (khớp contract v1.0):
- `post.id`, `dish.id`, `ingredient_id`, `comment.id`, `report.id` là **số nguyên**; chỉ `author.id` là **UUID**. Backend từ chối chuỗi cho `dish_id`/`ingredient_id` (ví dụ `"17"`), nên Frontend ép về số khi gửi (`mappers.js`).
- Thời gian ISO 8601 UTC, `snake_case`, thành công `{ data }` / `{ data: [...], meta: { page, limit, total } }`, lỗi `{ error: { code, message, details?: [{ field, message }] } }`.

Toàn bộ chỗ gọi API nằm trong `src/lib/api/`; chỉ `mappers.js` biết tên trường. Nếu contract đổi, chỉ sửa `mappers.js` và service tương ứng.

## 1. Đã khớp contract v1.0 (không còn là giả định)

| Chủ đề | Trạng thái |
|---|---|
| Kiểu ID | **Đã khớp.** Số nguyên (post, dish, ingredient), UUID cho `author.id`. Trước đây `api.md` ghi UUID, bản v1.0 đã sửa |
| `content` của bài | **Đã khớp.** Tùy chọn khi tạo (1–2000 ký tự), không gửi thì backend dùng `title`. Response chi tiết có `content` |
| `GET /api/dishes` | **Đã khớp.** Có `search`, `page`, `limit`, trả `{ data: [{ id, name, description, image_url }], meta }` (BE05 đã merge). `dishes.list` đọc được cả dạng cũ (mảng thuần) |
| `GET /api/posts`, `GET /api/posts/:id`, `POST /api/posts` | **Đã khớp** với `api.md` v1.0 (BE03, BE04 đã merge). Nguyên liệu có thêm `role` (`PRIMARY` \| `SECONDARY`), Frontend đọc `role` |
| `quantity: null` = Tùy khẩu vị | Đã khớp (G7) |
| Vai trò admin `ADMIN` | Đã chốt (G8) |
| Cổng dev 3000 | `api.md` v1.0 ghi 3000, khớp proxy Vite |
| Đã chạy thật (GET, 14/11/2026) | `/api/health`, `/api/posts` (có `type`, `q` thừa vẫn 200), `/api/posts/:id` (400 với `abc`, 404 với id không có), `/api/dishes?search=` (72 món), POST không token trả 401, origin lạ trả 403. Dữ liệu thật của bài 1 qua `mappers.js` ra đúng model (nguyên liệu `quantity: null` thành `toTaste`, `created_at` dạng `+00:00` đọc được). DB hiện chỉ có 1 bài nên "Xem thêm" chưa thử được với dữ liệu thật |
| Đối chiếu code backend (FE06, 14/11/2026, đọc `origin/sprint1-integration`, đã gọi thử các endpoint GET với backend thật, **chưa thử POST có đăng nhập**) | Khớp: phản hồi `{ data }` / `{ data, meta }`; lỗi `{ error: { code, message, details } }`; `limit` tối đa 50 (FE dùng 20); query lạ như `type`, `q` bị Zod bỏ qua nên `GET /api/posts` vẫn chạy; `:id` không phải số nguyên dương trả 400. Lệch đã xử lý ở FE: nguyên liệu trùng được backend báo ở trường `ingredients[i]` (không có `.name`) — Form đưa về ô tên nguyên liệu và tự kiểm tra trùng trước khi gửi; lỗi ở trường lạ hiện chung ở thông báo đầu form |

## 2. Việc đang mất hoặc lệch (cần TV1)

| # | Vấn đề | Frontend đang làm |
|---|---|---|
| 1 | **`GET /api/me` không còn.** Mất từ commit BE02 `3107a30` (05/11, scaffold thay `app.js`), xác nhận khi gộp BE05 ở `06b5a17` (13/11). `api.md` v1.0 không có route này, nhưng `docs/tv5-checklist.md` và QA01 (TC-AUTH-06) vẫn dùng | `me.get` vẫn gọi `/api/me`, nhận 404, `AuthProvider` đặt `profileError: 'failed'`. Hậu quả: mất huy hiệu admin, `RequireRole` chặn cả admin, không phát hiện tài khoản `LOCKED` lúc đăng nhập, hiện cảnh báo hồ sơ ở `AppLayout`. Bảng tin, chi tiết bài, đăng bài không bị ảnh hưởng. **Phải có lời giải trước FE08.** Cần TV1 xác nhận bỏ có chủ ý hay không, và nếu bỏ thì lấy `vai_tro`, `trang_thai` ở đâu |
| 2 | `GET /api/posts` chỉ trả `id`, `title`, `created_at`, `dish`, `author` | Card bảng tin chỉ hiện các trường này. Không có `content`, số nguyên liệu, số bước, số cảm xúc/bình luận. Nếu TV1 thêm `ingredient_count`, `step_count`, `content`, mapper đã đọc sẵn nên card tự hiện, không phải sửa giao diện |
| 3 | Khi người đăng không nhập nội dung, backend lưu `content = title` | Giao diện ẩn đoạn trích khi `content` giống `title` |
| 4 | Backend chỉ trả bài `RECIPE` + `PUBLIC` | Bài đánh giá quán, bản nháp, bài bị ẩn chưa có API (xem mục 3) |
| 5 | `GET /api/dishes` mặc định trả 20 món | `DishListPage` chưa phân trang, DB có hơn 20 món thì chỉ thấy 20 (FE09 sẽ làm) |

## 3. Chỗ contract thật khác kế hoạch ban đầu (Frontend giả định, qua mock)

Bài đăng công khai chưa có các trường dưới đây. Đây là phần Sprint 2, chưa có task backend nên vẫn là giả định:

| Thiếu trong contract | Frontend giả định | Dùng cho |
|---|---|---|
| `type` (công thức / đánh giá quán) | `type`: `RECIPE` \| `REVIEW`; `GET /api/posts?type=` (mặc định `RECIPE`). Thiếu `type` thì coi là `RECIPE` | FE07 hai tab |
| `status` (nháp) | `status`: `DRAFT` \| `PUBLISHED`; `POST /api/posts` nhận `status` | FE07 P1 (G5) |
| Tìm theo từ khóa | `GET /api/posts?q=` | FE07 |
| Số cảm xúc, bình luận | `like_count`, `dislike_count`, `comment_count`, `my_reaction` ở chi tiết bài | FE07 |
| Bài đánh giá quán | `restaurant: { name, address, price_range }` khi `type = REVIEW` | FE07 `ReviewPostCard` |

## 4. Endpoint chưa có trong contract (Frontend giả định, chạy qua mock)

Tất cả gọi qua `request(..., { mockable: true })`: khi `VITE_USE_MOCK=true` (chỉ dev) dùng bộ giả lập `src/lib/api/mock/`, ngược lại gọi backend thật. Phần này thuộc Sprint 2, chưa đụng tới.

| Phương thức, đường dẫn | Đăng nhập | Body / query | Response thành công | Lỗi Frontend xử lý | Service |
|---|---|---|---|---|---|
| `GET /api/dishes/:id` | Không | | `{ data: { id, name, description, image_url } }` | 400, 404 | `dishes.get` |
| `GET /api/dishes/:id/recipes` | Không | `page`, `limit` | `{ data: [{ id, dish_id, name, prep_time_minutes, ingredient_count, incomplete }], meta }`. Món chưa có công thức: `data: []` | 404 nếu món không tồn tại | `recipes.listByDish` |
| `GET /api/recipes/:id` | Không | | `{ data: { id, dish_id, name, prep_time_minutes, incomplete, ingredients[], steps[{ order, content }] } }` | 404 | `recipes.get` |
| `PATCH /api/posts/:id` | Có, chỉ tác giả | Như `POST /api/posts` | `{ data: <bài chi tiết> }` | 400, 403, 404 | `posts.update` |
| `DELETE /api/posts/:id` | Có, chỉ tác giả | | `204` | 403, 404 | `posts.remove` |
| `GET /api/me/drafts` | Có | `page`, `limit` | `{ data: [<bài tóm tắt>], meta }` | 401 | `posts.listDrafts` |
| `PUT /api/posts/:id/reaction` | Có | `{ value: "like" \| "dislike" \| null }` | `{ data: { my_reaction, like_count, dislike_count } }` | 400, 401, 404 | `reactions.set` |
| `GET /api/posts/:id/comments` | Không | `page`, `limit` | `{ data: [{ id, post_id, author{id,display_name}, content, created_at, edited_at }], meta }` | 404 | `comments.list` |
| `POST /api/posts/:id/comments` | Có | `{ content }` (1–1000 ký tự) | `201 { data: <bình luận> }` | 400, 401, 404 | `comments.create` |
| `PATCH /api/comments/:id` | Có, chỉ tác giả | `{ content }` | `{ data: <bình luận> }` | 400, 403, 404 | `comments.update` |
| `DELETE /api/comments/:id` | Có, chỉ tác giả | | `204` | 403, 404 | `comments.remove` |
| `POST /api/reports` | Có | `{ target_type: "POST" \| "COMMENT", target_id (số nguyên), reason }` | `201 { data: { target_type, target_id } }` | 400, 404, **409** nếu đã báo cáo | `reports.create` |
| `GET /api/admin/reports` | Quản trị viên | `status` (`PENDING` \| `RESOLVED`), `page`, `limit` | `{ data: [{ id, target_type, target_id, excerpt, reason, report_count, created_at, status, resolution }], meta }` | 401, 403 | `admin.listReports` |
| `POST /api/admin/content/:type/:id/hide` | Quản trị viên | `type` = `posts` \| `comments`; `{ reason }` | `{ data: <báo cáo đã xử lý> }` | 400, 403, 404 | `admin.hideContent` |

Quy tắc kèm theo Frontend giả định:
- Nội dung bị ẩn hoặc xóa: `GET /api/posts/:id` trả **404** ("Bài viết không còn khả dụng") và bài không xuất hiện ở danh sách.
- Bản nháp chỉ chủ bài thấy; người khác nhận 404.
- Backend tự kiểm tra quyền tác giả, quản trị viên (NFR03). Báo cáo trùng trả 409 (`CONFLICT`).

## 5. Hành vi của bộ giả lập cần biết (không phải yêu cầu với backend)

- Chỉ nạp khi `import.meta.env.DEV` và `VITE_USE_MOCK === 'true'`. Dữ liệu nằm trong bộ nhớ, mất khi tải lại trang.
- **Mock theo contract v1.0:** ID là số nguyên (`author.id` là UUID); `:id` không phải số nguyên dương trả 400; `dish_id` là chuỗi bị 400; `GET /api/posts` chỉ trả `id`, `title`, `created_at`, `dish`, `author` cho bài công thức; không gửi `content` thì lấy `title`.
- `GET /api/dishes` và `GET /api/me` **không bao giờ** đi qua mock. Vì vậy `dish_id` mà form tạo bài gửi lên mock là ID món thật; mock chấp nhận ID lạ và hiện tên món "Món ăn" nếu không khớp 5 món mẫu.
- Mọi người đã đăng nhập đều được mock coi là quản trị viên ở `/api/admin/*`. Thử lỗi bằng `__citrusMock.failNext(400|401|403|404|409|500)` trong console. Độ trễ mặc định 300 ms.
- Dữ liệu mẫu: 7 bài công thức hiển thị và 1 bài bị ẩn, 4 bài đánh giá quán, 4 bình luận (1 đã sửa), cảm xúc, 3 báo cáo, 5 công thức theo món (1 thiếu bước, 1 món chưa có công thức).

## 6. Câu hỏi cho TV1

1. `GET /api/me` bị bỏ có chủ ý không? Nếu có, Frontend lấy `vai_tro` và `trang_thai` ở đâu? (mục 2 #1, cần trước FE08.)
2. Có thể thêm `ingredient_count`, `step_count` (và nếu muốn, đoạn trích) vào `GET /api/posts` không? (mục 2 #2, không bắt buộc.)
3. Sprint 2 sẽ có backend cho bình luận, cảm xúc, báo cáo, quản trị, bản nháp không, ai phụ trách? (mục 3, 4.)
4. (FE06) Backend làm sạch `title`, `content`, `unit`, `steps[].content` bằng cách **bỏ thẻ HTML** (`<...>`) rồi mới đếm độ dài, nên giao diện có thể thấy lỗi "ít nhất 3 ký tự" với tiêu đề như `<b>`. Đây là hành vi có chủ ý hay không? Frontend không cần sửa.
5. (FE06) CORS: backend trả 403 `FORBIDDEN` cho `Origin` không có trong `CORS_ORIGINS`. Khi triển khai (Vercel) phải thêm origin của frontend vào biến này. Trong dev, Vite proxy gửi `Origin: http://localhost:5173`, đã nằm trong mặc định.
6. (FE06) `GET /api/dishes` cần `SUPABASE_SERVICE_ROLE_KEY` ở backend; thiếu thì 500 và ô chọn món báo không tải được danh sách.
7. (FE06) `backend/.env` của máy TV2 thiếu `SUPABASE_ANON_KEY` nên backend không khởi động (`[ENV ERROR]`). Cần điền trước khi thử tích hợp.
