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

Contract chi tiết: [api.md mục 7](api.md#7-catalog-sprint-2--đối-chiếu-be09-bổ-sung-fe-tra-cứu-ngày-24112026). Các màn hình chỉ dùng model camelCase từ service/mapper. Không có truy vấn Supabase trực tiếp từ giao diện.

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
