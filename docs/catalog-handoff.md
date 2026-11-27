# Bàn giao tìm món và công thức — S2-03, S2-04

Triển khai ngày 24/11/2026 trên nhánh `feature/fe04_search-dishes_dishes-info_recipe-info`, nối route khung FE07. Tiêu chí S2-03/S2-04 ở đây theo yêu cầu tìm món/công thức của task.

## Luồng sử dụng

`/search` → `/dishes/:id` → **Tự nấu** → `/dishes/:id/recipes` → `/recipes/:id`.

- Tìm theo tên, hỗ trợ không dấu; lọc kết hợp loại món, khẩu vị và thời gian tối đa; 12 món/trang. Đổi từ khóa/bộ lọc đưa về trang 1.
- URL lưu bộ lọc và trang; liên kết quay lại giữ URL đó qua các màn hình. Browser Back khôi phục cùng danh sách truy vấn và bộ lọc.
- Loading/rỗng/lỗi được phân biệt; lỗi có thử lại. Món/công thức 404 có thông báo và lối quay lại. Công thức lỗi giữ liên kết tới danh sách đã mở; mở URL công thức trực tiếp thì suy ra món từ `dish_id` khi có dữ liệu, nếu không có thì về tìm món.
- Chi tiết món có mô tả/hình ảnh (placeholder nếu thiếu hoặc tải hình lỗi), lựa chọn **Tự nấu**, nút **Quán ăn · Sắp có** bị vô hiệu hóa.
- Công thức hiển thị khẩu phần, thời gian, lượng/đơn vị nguyên liệu và các bước đánh số. Thiếu khẩu phần/thời gian hiển thị “Chưa cập nhật”; chỉ lượng null hiện “Tùy khẩu vị”. Món chưa có công thức và công thức thiếu hướng dẫn được báo rõ (QĐ 1.5).
- Request cũ bị abort khi đổi trang/bộ lọc; phản hồi đến muộn không ghi đè kết quả mới. Bố cục một cột trên điện thoại, mở rộng trên desktop, controls tối thiểu 44px.

## Tích hợp BE07/BE09

Contract chính thức là [api.md mục 7.4–7.7](api.md#74-get-apidishes--tìm-và-lọc-món-mở-rộng-mục-25) (v2.0, PO đã chốt). Mô tả implementation của FE10 nằm ở phần "Mô tả implementation" cuối file này; chỗ nào khác contract được liệt kê ở "Điểm khác contract v2.0". Các màn hình chỉ dùng model camelCase từ service/mapper. Không có truy vấn Supabase trực tiếp từ giao diện.

BE09 đã có trong repo. Thay đổi này bổ sung `category` từ controller/service đến tham số SQL `p_category` đã tồn tại; `/api/dishes/categories` đọc taxonomy hiện có cho dropdown. Không tự tạo danh mục loại món cho dữ liệu thật. Mock dùng hai loại mẫu để QA. Chưa có taxonomy thật thì dropdown báo rõ, các bộ lọc khác vẫn dùng được.

Điều kiện chạy API thật: schema BE07 và SQL BE09 `supabase/202611220002_be09_catalog_read.sql` đã áp dụng trên DB đích. Không chạy hay thay đổi dữ liệu Supabase thật trong task này. BE09 hiện trả `servings: null`; UI sẵn sàng hiển thị khi API có số khẩu phần.

## Chạy và kiểm tra

```sh
npm ci --prefix frontend
VITE_USE_MOCK=true npm run dev --prefix frontend -- --host 127.0.0.1 --port 5174
```

Mở `http://127.0.0.1:5174/search`. Đặt `VITE_USE_MOCK=false` để gọi API thật. Production luôn bỏ qua mock; khi API lỗi không tự chuyển sang dữ liệu mẫu. Cờ `VITE_USE_MOCK_API` của tab gợi ý là cờ riêng.

```sh
npm test --prefix frontend
npm test --prefix backend
npm run lint --prefix frontend
npm run lint --prefix backend
npm run build --prefix frontend
```

Browser QA có thể tái lập với Playwright cài ở thư mục tạm, không thay dependencies dự án:

```sh
npm install --prefix /tmp/citrus-browser playwright --no-save
# Nếu máy chưa có Chromium: dùng CLI playwright install chromium từ thư mục này.
PLAYWRIGHT_MODULE=/tmp/citrus-browser/node_modules/playwright/index.mjs node docs/catalog-browser-qa.mjs
```

Script chấp nhận `CATALOG_QA_URL`, `CATALOG_QA_OUTPUT`, `CHROMIUM_PATH` để đổi URL/thư mục bằng chứng/binary Chromium. Dùng Vite mock; ca phân trang thêm 13 bản ghi chỉ vào bộ nhớ trình duyệt, không ghi DB.

## Bằng chứng ngày 24/11/2026

- Frontend: 198 test (26 file) đạt; có test tích hợp đi qua service → mapper → UI cho toàn luồng, lỗi/rỗng/404/thiếu dữ liệu, phân trang, browser Back, khôi phục bộ lọc và race request; test gate xác nhận mock/real gửi đúng query.
- Backend: 233 test Vitest và 10 test Node đạt, gồm category-only/kết hợp bộ lọc/validation/metadata taxonomy. Test API dùng client DB giả lập; không chứng minh deployment DB đích.
- Build production đạt. Lint frontend/backend đạt; frontend còn bốn cảnh báo có sẵn trong phần gợi ý/nguyên liệu, không phát sinh cảnh báo ở code mới. Build còn cảnh báo bundle lớn hơn 500kB.
- Chromium ở 320px, 390px, 1440px: PASS toàn luồng, lọc/tìm không dấu, quay lại, phân trang, empty/404/incomplete; không tràn ngang và không có JS runtime error.
- [Kết quả browser QA](catalog-qa-2026-11-24/results.json), [tìm món 320px](catalog-qa-2026-11-24/search-320.png), [công thức 320px](catalog-qa-2026-11-24/recipe-320.png), [tìm món desktop](catalog-qa-2026-11-24/search-1440.png), [công thức desktop](catalog-qa-2026-11-24/recipe-1440.png).

Reviewer đề xuất: `rabbitvn66`, dựa trên tác giả phần FE07 trong lịch sử Git; cần PR ghi nhận request review thực tế, không coi đề xuất trong tài liệu là đã có review.

## Mô tả implementation (chuyển từ `api.md` mục 7 của nhánh FE10, 24/11/2026)

> Nội dung dưới đây là mô tả những gì code FE10 + BE09 đang làm. Không phải contract; khi khác nhau thì `api.md` mục 7 thắng.

Các response vẫn theo envelope/error và ID số nguyên của Sprint 1. Quyền: công khai, chỉ món/công thức công khai và ACTIVE. SQL BE09: `supabase/202611220002_be09_catalog_read.sql`, dựa trên schema/view BE07. Đây là mô tả implementation trong repo; chưa xác nhận triển khai lên Supabase đích.

### Tìm và lọc: `GET /api/dishes`

Giữ nguyên `search`, `page`, `limit`, `ingredients` ở mục 2.5. `search` tối đa 100 ký tự sau trim, không phân biệt hoa/thường và dấu tiếng Việt; các bộ lọc kết hợp bằng AND trước khi phân trang.

| Query | Quy tắc |
|---|---|
| `category` | Bổ sung trong thay đổi FE tra cứu: mã lấy từ `/api/dishes/categories`, 1–100 ký tự `A-Z`, `0-9`, `_`. Truyền `p_category` vào RPC `search_catalog_dishes` đã có của BE09 |
| `flavor` | `MAN`, `CAY`, `NGOT`, `CHUA`, `THANH` |
| `max_cook_time` | Số nguyên 1–1440, phút. So với thời gian nhỏ nhất của các công thức công khai của món; món chưa có thời gian bị loại khi bật bộ lọc |
| `the` | Giữ API BE09: các tag cách nhau dấu phẩy (`TROI_MUA`, `LUOI_NAU`, `CUOI_THANG`, `NAU_CHO_4`, `AN_NHE`) |

Frontend gửi 12 món/trang. Không có kết quả trả `200 { data: [], meta: { page, limit, total: 0 } }`. Sai query trả `400 VALIDATION_ERROR`; lỗi DB trả `500 INTERNAL_ERROR`.

### Danh mục loại món: `GET /api/dishes/categories`

Endpoint bổ sung cho dropdown, không yêu cầu đăng nhập. Đọc `thuoc_tinh_mon` thuộc nhóm `LOAI_MON`, `LOAI`, `CATEGORY`, `TYPE` (chuẩn hóa bỏ dấu/hoa thường). Mã chuẩn hóa tương ứng phép so khớp category của SQL BE09. Không tự thêm taxonomy hay gán loại món vào DB.

```json
{ "data": [{ "code": "MON_NUOC", "name": "Món nước" }] }
```

Đây là ví dụ, không phải danh mục bắt buộc. Không có taxonomy trả `data: []`; lỗi DB trả 500. Mã trùng được gộp, tên sắp xếp theo tiếng Việt.

### Món và danh sách công thức

- `GET /api/dishes/:id` trả `{ data: { id, name, description, image_url, cook_time_minutes, flavor, region, tags, recipes } }` theo BE09. Frontend dùng tên, mô tả, hình; thiếu hình có placeholder.
- `GET /api/dishes/:id/recipes?page=1&limit=12` trả `{ data: [RecipeSummary], meta: { page, limit, total } }`.
- `RecipeSummary`: `{ id, dish_id, name, servings, prep_time_minutes, ingredient_count, incomplete }`.
- Món tồn tại nhưng chưa có công thức: `data: []`, total 0. Món không tồn tại/không công khai: 404. Sai ID/page/limit: 400.

### Chi tiết công thức: `GET /api/recipes/:id`

Cấu trúc response theo `api.md` mục 7.7. Hành vi phía UI/implementation: `servings` và `prep_time_minutes` nullable. BE07 chưa lưu khẩu phần nên BE09 hiện trả `servings: null`; UI hiện "Chưa cập nhật", không tự gán khẩu phần. Số lượng/đơn vị hiển thị theo dữ liệu; chỉ `quantity: null` hiện "Tùy khẩu vị"; số lượng có nhưng đơn vị thiếu thì báo "chưa có đơn vị". Các bước sắp xếp và hiển thị theo `order`. `incomplete` là `NOT du_thong_tin_huong_dan` của view BE07, được hiển thị cảnh báo; không ẩn dữ liệu còn có. Không tồn tại/không công khai: 404; DB lỗi: 500.

## Điểm khác contract v2.0 (INT03 ghi nhận 24/11/2026, chưa sửa contract)

| # | Implementation FE10/BE09 | Contract `api.md` mục 7 / AC | Việc cần quyết |
|---|---|---|---|
| 1 | `GET /api/dishes?category=` (mã `A-Z0-9_`, truyền `p_category`) | Không có tham số `category`; lọc loại món **DEFERRED Sprint 3** (AC S2-03.2) | PO: giữ ở code nhưng ẩn UI, hoặc đưa vào contract Sprint 3 |
| 2 | `GET /api/dishes/categories` | Không có endpoint này | Như trên. Hiện gọi thật trả 500 do `service_role` chưa có quyền đọc `thuoc_tinh_mon` |
| 3 | `flavor` được FE gửi và UI có bộ lọc khẩu vị | `flavor` luôn `null` trong Sprint 2, bộ lọc "chưa hoạt động"; UI không hiển thị bộ lọc khẩu vị (AC S2-03.2) | Ẩn bộ lọc trên SearchPage |
| 4 | `search` tối đa 100 ký tự sau trim | Contract không nêu giới hạn | PO: ghi giới hạn vào contract nếu đồng ý |
| 5 | `GET /api/dishes/:id/recipes` mặc định FE gửi `limit=12` | Ví dụ contract dùng `limit` 20 | Không xung đột (chỉ là giá trị FE chọn) |
| 6 | SQL BE09 nằm ở `supabase/202611220002_be09_catalog_read.sql` (gốc `supabase/`), không có trong `supabase/apply.sql` | Contract trỏ tới `supabase/migrations/` | Bảo/Châu: chuyển vào `migrations/` và thêm vào `apply.sql` nếu muốn chạy trên DB mới |

