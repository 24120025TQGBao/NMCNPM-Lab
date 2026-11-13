# Kế hoạch Kiểm thử & Danh mục Test Case Sprint 1 (QA01)

- **Dự án:** "Hôm nay ăn gì?"
- **Mã Task:** `QA01`
- **Người thực hiện:** TV5 (Tester/DevOps — Nguyễn Hà Minh Hiền)
- **Ngày lập:** 11/11/2026 (Cập nhật theo API Contract `BE01` v1.0 commit `3689f48`)
- **Tài liệu tham chiếu:**
  - Kế hoạch Sprint 1 & Phân công (`Ke_hoach_Sprint_Phan_cong_Hom_nay_an_gi.md`)
  - API Contract Sprint 1 ([`docs/api.md`](api.md))
  - Database Schema & Data Dictionary (`DB01`–`DB07`)

---

## 1. Kế hoạch Kiểm thử (Test Plan)

### 1.1. Mục tiêu kiểm thử (Sprint Goal)
Đảm bảo chất lượng các tính năng thuộc phạm vi Sprint 1:
> *"Người dùng đăng ký, đăng nhập, đăng bài công thức có cấu trúc, và mọi người xem được bài đó trên bảng tin."*

### 1.2. Phạm vi kiểm thử (Scope)

#### A. Trong phạm vi (In-Scope):
1. **Story S1-01:** Đăng ký, đăng nhập, đăng xuất, duy trì phiên khi tải lại trang (Auth & Session persistence).
2. **Story S1-02:** Tạo bài công thức tối thiểu (chọn món, tiêu đề, nguyên liệu + định lượng + đơn vị, các bước nấu theo thứ tự).
3. **Story S1-03:** Xem bảng tin bài viết công khai và xem chi tiết bài viết (loading, empty state, error state, phân trang).
4. **Story S1-06 (Hỗ trợ):** Tra cứu danh sách món ăn `ACTIVE`, tìm kiếm theo tên và phân trang (`GET /api/dishes`).

#### B. Ngoài phạm vi Sprint 1 (Out-of-Scope):
- Upload hình ảnh/video trực tiếp (dùng URL hoặc placeholder).
- Sửa/xóa bài viết, lưu bài nháp.
- Bình luận, like/tim, bookmark.
- Bản đồ quán ăn, gợi ý món ăn theo nguyên liệu nâng cao (Sprint 3–4).

### 1.3. Môi trường và Công cụ kiểm thử
- **Môi trường:**
  - Local API: `http://localhost:3000/api`
  - Local Frontend: `http://localhost:5173`
  - Cơ sở dữ liệu: Supabase Database (PostgreSQL 15+)
- **Công cụ:**
  - Postman / curl: Kiểm thử API endpoints độc lập.
  - Supabase SQL Editor / Admin UI: Kiểm tra dữ liệu thực tế và tính toàn vẹn khóa ngoại.
  - Trình duyệt Web: Google Chrome, Mozilla Firefox, và Chrome DevTools Mobile Viewport (iPhone 12/14/15 390×844).
  - Node.js test runner / Supertest / Vitest: Kiểm thử tự động backend.

### 1.4. Tiêu chí Chấp nhận & Đánh giá (Criteria)
- **Pass:** Đúng HTTP Status Code, đúng cấu trúc JSON response theo contract, dữ liệu DB thay đổi chính xác, UI hiển thị thân thiện không tràn layout.
- **Fail:** Trả sai mã lỗi, sai trường dữ liệu, rò rỉ thông tin nhạy cảm (email, service key, SQL error), transaction không rollback khi gặp lỗi.
- **Blocked:** Tính năng hoặc endpoint phụ thuộc chưa được triển khai hoặc chưa tích hợp vào nhánh kiểm thử.

---

## 2. Ma trận Test Cases chi tiết

### 2.1. Nhóm 1: Xác thực & Quản lý phiên (Story S1-01 — Auth & Session)

| Mã Case | Tên trường hợp | Loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|---|---|
| **TC-AUTH-01** | Đăng ký tài khoản mới hợp lệ | UI / API | Email chưa tồn tại trong Auth; biết chính sách email `DB06` | 1. Mở trang đăng ký<br>2. Nhập họ tên, email, mật khẩu<br>3. Bấm "Tạo tài khoản" | `name`: "Nguyễn Văn A"<br>`email`: `user_test_01@example.com`<br>`password`: `Password123!` | Tạo tài khoản Auth thành công. Tạo 1 bản ghi tương ứng trong bảng `nguoi_dung` với trạng thái `ACTIVE`. Nếu bật xác nhận email: thông báo kiểm tra hòm thư. Nếu tắt: tự động đăng nhập. | Sẵn sàng test |
| **TC-AUTH-02** | Đăng ký với email đã tồn tại | UI / API | Email đã được đăng ký trước đó | 1. Mở trang đăng ký<br>2. Nhập email đã tồn tại cùng mật khẩu hợp lệ<br>3. Submit | `email`: `user_test_01@example.com` | Không tạo thêm tài khoản trùng. Hiển thị thông báo lỗi rõ ràng bằng tiếng Việt, không làm crash ứng dụng. | Sẵn sàng test |
| **TC-AUTH-03** | Đăng ký với email sai định dạng | UI | Đang ở form đăng ký | 1. Nhập email không hợp lệ (thiếu `@`, thiếu domain)<br>2. Submit | `email`: `testuser_invalid.com`<br>`password`: `Password123!` | Client chặn submit ngay tại form, báo lỗi trường email không đúng định dạng. Không gửi request lên server. | Sẵn sàng test |
| **TC-AUTH-04** | Đăng ký với mật khẩu ngắn hơn 6 ký tự | UI / API | Đang ở form đăng ký | 1. Nhập email hợp lệ<br>2. Nhập mật khẩu < 6 ký tự<br>3. Submit | `password`: `12345` | Báo lỗi mật khẩu phải có ít nhất 6 ký tự. Không tạo tài khoản. | Sẵn sàng test |
| **TC-AUTH-05** | Đăng nhập với mật khẩu sai | UI / API | Tài khoản đã tồn tại | 1. Nhập email đúng<br>2. Nhập mật khẩu sai<br>3. Bấm "Đăng nhập" | `email`: `user_test_01@example.com`<br>`password`: `WrongPassword` | Đăng nhập thất bại. Hiển thị thông báo "Thông tin đăng nhập không chính xác". Không cấp token/session. | Sẵn sàng test |
| **TC-AUTH-06** | Đăng nhập thành công | UI / API | Tài khoản hợp lệ, đã xác nhận (nếu có yêu cầu) | 1. Nhập đúng email và mật khẩu<br>2. Bấm "Đăng nhập" | `email`: `user_test_01@example.com`<br>`password`: `Password123!` | Đăng nhập thành công. Header đổi sang trạng thái đã đăng nhập, hiện tên hiển thị. Endpoint `GET /api/me` trả về thông tin profile (status 200). | Sẵn sàng test |
| **TC-AUTH-07** | Duy trì phiên khi tải lại trang (F5) | UI | Đã đăng nhập thành công ở TC-AUTH-06 | 1. Nhấn F5 (Reload page)<br>2. Quan sát trạng thái header và phiên | N/A | Phiên đăng nhập được phục hồi tự động thông qua token lưu trữ. Không bị văng ra màn hình đăng nhập. | Sẵn sàng test |
| **TC-AUTH-08** | Đăng xuất tài khoản | UI | Đang ở trạng thái đăng nhập | 1. Bấm nút "Đăng xuất"<br>2. Nhấn F5 tải lại trang | N/A | Xóa session và token cục bộ. Giao diện trở về trạng thái khách (Guest). F5 không phục hồi tài khoản cũ. | Sẵn sàng test |
| **TC-AUTH-09** | Guard route trang tạo bài viết | UI | Chưa đăng nhập (Guest) | 1. Gõ trực tiếp URL `/posts/new` vào thanh địa chỉ trình duyệt | URL: `http://localhost:5173/posts/new` | Chặn truy cập, tự động chuyển hướng về trang `/login` kèm thông báo cần đăng nhập. | Blocked (Chờ FE03/FE01 route) |

---

### 2.2. Nhóm 2: Đăng bài viết công thức (Story S1-02 — Recipe Posts)

> Tham chiếu contract: `POST /api/posts`, header `Authorization: Bearer <token>`.

| Mã Case | Tên trường hợp | Loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|---|---|
| **TC-POST-01** | Gọi API đăng bài khi chưa đăng nhập (Thiếu token) | API | Backend đang chạy | Gửi request `POST /api/posts` không kèm header `Authorization` | Body JSON bất kỳ | HTTP **401 Unauthorized**.<br>Body: `{"error": {"code": "UNAUTHORIZED", "message": "..."}}`. Không có dữ liệu nào được ghi vào DB. | Sẵn sàng test (BE02/BE03) |
| **TC-POST-02** | Gọi API đăng bài với token không hợp lệ / hết hạn | API | Backend đang chạy | Gửi request `POST /api/posts` kèm `Authorization: Bearer invalid_token_xyz` | Body JSON hợp lệ | HTTP **401 Unauthorized**.<br>Code: `UNAUTHORIZED`. | Sẵn sàng test |
| **TC-POST-03** | Đăng bài thiếu các trường bắt buộc | API | Đã có access token hợp lệ | Gửi `POST /api/posts` lần lượt thiếu: `dish_id`, `title`, `ingredients`, `steps` | Gửi payload thiếu từng trường | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`, mảng `details` chỉ rõ trường bị thiếu. Không lưu DB. | Sẵn sàng test |
| **TC-POST-04** | Đăng bài với tiêu đề không hợp lệ (< 3 hoặc > 150 ký tự) | API | Token hợp lệ | Gửi `POST /api/posts` với title "AB" (2 ký tự) hoặc chuỗi > 150 ký tự | `title`: "AB" | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`, detail: `title` từ 3–150 ký tự. | Sẵn sàng test |
| **TC-POST-05** | Đăng bài với ID món ăn không tồn tại | API | Token hợp lệ | Gửi `POST /api/posts` với `dish_id` là số nguyên không có trong DB | `dish_id`: `999999` | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`, message: Món ăn không tồn tại hoặc không ACTIVE. | Sẵn sàng test |
| **TC-POST-06** | Đăng bài với định lượng nguyên liệu không hợp lệ (<= 0 hoặc là chuỗi) | API | Token hợp lệ | Gửi `POST /api/posts` với `quantity: -5` hoặc `quantity: "nửa ký"` | `quantity`: `-5` | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`, detail: Định lượng phải là số > 0 hoặc null. | Sẵn sàng test |
| **TC-POST-07** | Đăng bài với nguyên liệu bị trùng lặp trong công thức | API | Token hợp lệ | Gửi `POST /api/posts` có 2 nguyên liệu trùng tên hoặc trùng `ingredient_id` | 2 phần tử `name: "thịt bò"` | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`, báo lỗi nguyên liệu trùng lặp trong công thức. | Sẵn sàng test |
| **TC-POST-08** | Tạo bài viết công thức hợp lệ đầy đủ (Happy Path) | API / DB | Token hợp lệ; món ăn `ACTIVE` tồn tại (ví dụ `dish_id: 17`) | Gửi `POST /api/posts` với payload đầy đủ món, tiêu đề, nguyên liệu (có role, quantity, unit) và các bước | ```json { "dish_id": 17, "title": "Phở bò truyền thống", "content": "Bí quyết nước dùng ngọt trong", "ingredients": [ {"ingredient_id": 100, "quantity": 500, "unit": "g", "role": "PRIMARY"}, {"name": "hành tây", "quantity": 1, "unit": "củ", "role": "SECONDARY"} ], "steps": [ {"content": "Chần xương bò với nước sôi"}, {"content": "Ninh xương trong 3 giờ"} ] } ``` | HTTP **201 Created**.<br>Trả về JSON chi tiết bài đăng có `id` (bigint), `dish`, `author` (lấy từ token), mảng `ingredients`, mảng `steps` có thứ tự `order: 1, 2`.<br>DB tạo đủ 4 bản ghi liên kết: `bai_dang`, `cong_thuc`, `ct_nguyen_lieu`, `buoc_cong_thuc`. Không lộ email tác giả. | Blocked (Chờ merge BE03 & RPC DB09) |
| **TC-POST-09** | Tính nguyên tử của Transaction (Rollback khi gặp lỗi) | API / DB | Token hợp lệ; kích hoạt lỗi ở thao tác con (bước hoặc nguyên liệu) | Gửi request tạo bài nhưng cố ý gây lỗi ở bảng con (ví dụ bước công thức vượt quá giới hạn) | Payload gây lỗi ở bảng con | HTTP **400** hoặc **500**.<br>Toàn bộ Transaction bị **ROLLBACK**. Kiểm tra bảng `bai_dang` và `cong_thuc` không bị lưu bản ghi rác/mồ côi. | Blocked (Chờ RPC DB09) |
| **TC-POST-10** | Tạo bài viết từ giao diện Web (UI Form) | UI | Đã đăng nhập trên trình duyệt | 1. Vào form tạo bài `/posts/new`<br>2. Chọn món ăn từ dropdown/search<br>3. Nhập tiêu đề, thêm 2 nguyên liệu, thêm 2 bước<br>4. Bấm "Đăng bài" | Dữ liệu hợp lệ | Gửi request thành công, hiển thị thông báo tạo bài thành công và tự động chuyển hướng sang trang chi tiết bài viết mới tạo. | Blocked (Chờ FE05) |

---

### 2.3. Nhóm 3: Xem Bảng tin & Chi tiết bài viết (Story S1-03 — Feed & Post Details)

| Mã Case | Tên trường hợp | Loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|---|---|
| **TC-FEED-01** | Trạng thái đang tải (Loading state) | UI | Mạng chậm (DevTools Slow 3G) | 1. Mở trang chủ bảng tin `/`<br>2. Quan sát giao diện khi API đang fetch | DevTools Network Throttling: Slow 3G | Hiển thị skeleton hoặc thông báo đang tải ("Loading dishes… / Loading posts…"). Giao diện không bị giật lag. | Sẵn sàng test |
| **TC-FEED-02** | Trạng thái bảng tin rỗng (Empty state) | UI / API | Cơ sở dữ liệu chưa có bài viết nào (`bai_dang` rỗng) | 1. Mở trang bảng tin `/` | DB rỗng | HTTP 200, `"data": []`.<br>Giao diện hiển thị thông báo rỗng thân thiện ("Chưa có bài viết nào..."), không bị trắng trang hay crash. | Sẵn sàng test |
| **TC-FEED-03** | Trạng thái lỗi tải bảng tin (Error state) | UI | Ngắt kết nối mạng hoặc server 500 | 1. Chặn request `/api/posts` bằng DevTools hoặc tắt server backend<br>2. Tải lại trang | Network Offline | Hiển thị thông báo lỗi rõ ràng kèm nút "Thử lại" (Retry). | Sẵn sàng test |
| **TC-FEED-04** | Xem danh sách bài viết công khai (Phân trang & Sắp xếp) | API | Đã có dữ liệu nhiều bài viết trong DB | Gửi `GET /api/posts?page=1&limit=10` | `page=1`, `limit=10` | HTTP **200 OK**.<br>Danh sách bài có `loai_bai = 'RECIPE'` và `trang_thai = 'PUBLIC'`. Sắp xếp bài mới nhất lên trước (`created_at` giảm dần). Có metadata `page`, `limit`, `total`. Không chứa trường email tác giả. | Blocked (Chờ merge BE04) |
| **TC-FEED-05** | Phân trang bài viết với tham số không hợp lệ | API | Backend đang chạy | Gửi `GET /api/posts?page=-1&limit=abc` | `page=-1`, `limit=abc` | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`, thông báo tham số phân trang không hợp lệ. | Blocked (Chờ merge BE04) |
| **TC-FEED-06** | Xem chi tiết bài viết tồn tại | API / UI | Có bài viết `id: 51` trong DB | Gửi `GET /api/posts/51` hoặc click vào thẻ bài trên UI | ID bài: `51` | HTTP **200 OK**.<br>Trả về đầy đủ thông tin: tiêu đề, mô tả, món ăn liên quan, tác giả, danh sách nguyên liệu (đủ số lượng/đơn vị/vai trò), danh sách bước nấu sắp xếp đúng theo số thứ tự `order: 1, 2, 3...`. | Blocked (Chờ merge BE04) |
| **TC-FEED-07** | Xem chi tiết bài viết với ID không tồn tại | API / UI | Không có bài viết `id: 999999` | Gửi `GET /api/posts/999999` | ID: `999999` | HTTP **404 Not Found**.<br>Body: `{"error": {"code": "NOT_FOUND", "message": "..."}}`. UI hiển thị trang 404 thân thiện. | Blocked (Chờ merge BE04) |
| **TC-FEED-08** | Xem chi tiết bài viết với ID sai định dạng (không phải số nguyên dương) | API | Backend đang chạy | Gửi `GET /api/posts/abc` hoặc `GET /api/posts/-1` | ID: `abc` | HTTP **400 Bad Request**.<br>Code: `VALIDATION_ERROR`. | Blocked (Chờ merge BE04) |

---

### 2.4. Nhóm 4: Tra cứu món ăn (Story S1-06 — Dishes Lookup)

| Mã Case | Tên trường hợp | Loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|---|---|
| **TC-DISH-01** | Lấy danh sách món ăn công khai | API | DB đã nạp dataset mẫu (hoặc `seed.sql`) | Gửi `GET /api/dishes` không token | N/A | HTTP **200 OK**.<br>Danh sách các món có `trang_thai = 'ACTIVE'`, gồm `id`, `name`, `description`, `image_url`. | Pass (Endpoint hiện tại đã trả mảng món) |
| **TC-DISH-02** | Tìm kiếm món ăn theo tên (Có dấu & Không dấu) | API | DB có món "Phở bò" | 1. Gửi `GET /api/dishes?search=Phở`<br>2. Gửi `GET /api/dishes?search=pho` | `search=Phở`<br>`search=pho` | HTTP **200 OK**.<br>Cả 2 request đều tìm thấy và trả về kết quả chứa món "Phở bò" (không phân biệt hoa thường và không dấu). | Blocked (Chờ BE05 hoàn thiện query) |
| **TC-DISH-03** | Tìm kiếm món ăn với từ khóa không khớp | API | DB có dữ liệu | Gửi `GET /api/dishes?search=mon_an_khong_co_that_xyz` | Từ khóa không tồn tại | HTTP **200 OK**.<br>Trả về `"data": []`, `"meta": {"total": 0}`. Không báo lỗi 404 hay 500. | Blocked (Chờ BE05) |
| **TC-DISH-04** | Phân trang danh sách món với tham số sai | API | Backend đang chạy | Gửi `GET /api/dishes?page=0&limit=-1` | `page=0`, `limit=-1` | HTTP **400 Bad Request**.<br>Báo lỗi validation tham số phân trang. | Blocked (Chờ BE05) |

---

## 3. Ma trận kiểm thử Hồi quy đa môi trường (QA03 Regression Matrix)

Kịch bản end-to-end kiểm tra luồng chính của Sprint Goal:
> **Đăng ký (TC-AUTH-01) → Đăng nhập (TC-AUTH-06) → Tạo bài viết (TC-POST-10) → Xem bài trên bảng tin (TC-FEED-04) → Xem chi tiết bài (TC-FEED-06) → F5 tải lại (TC-AUTH-07) → Đăng xuất (TC-AUTH-08)**

| Môi trường kiểm thử | Độ phân giải / Viewport | Kết quả kiểm tra giao diện | Kết quả luồng nghiệp vụ | Ghi chú |
|---|---|---|---|---|
| **Google Chrome (Desktop)** | 1920×1080 (Chuẩn PC) | Chờ FE hoàn thiện | Chờ API tích hợp | Kiểm tra form, thẻ bài, responsive layout |
| **Mozilla Firefox (Desktop)** | 1920×1080 (Chuẩn PC) | Chờ FE hoàn thiện | Chờ API tích hợp | Kiểm tra độ tương thích CSS Grid/Flexbox |
| **Mobile Safari/Chrome (DevTools)** | 390×844 (Viewport iPhone 12/14) | Chờ FE hoàn thiện | Chờ API tích hợp | Đảm bảo nút bấm dễ thao tác, form không bị tràn ngang |

---

## 4. Danh sách các điểm cần làm rõ với các thành viên khác (Gaps & Action Items)

| Mã | Nội dung cần làm rõ | Bên phụ trách | Tác động đến QA |
|---|---|---|---|
| **GAP-01** | Quyết định chính thức về việc bật hay tắt xác nhận email trên dev/staging (`DB06`) | TV3 + TV1 | Ảnh hưởng trực tiếp đến bước kiểm thử của `TC-AUTH-01` và `TC-AUTH-06`. |
| **GAP-02** | Đồng bộ schema trong code `BE03`/`BE04` (hiện dùng UUID) sang chuẩn ID số nguyên và tên cột tiếng Việt của contract mới `docs/api.md` | TV1 | Đang chặn việc chạy test tự động và nghiệm thu cho toàn bộ `TC-POST-*` và `TC-FEED-*`. |
| **GAP-03** | Triển khai hàm Postgres RPC lưu bài nguyên tử trong transaction (`DB09`) | TV3 + TV1 | Điều kiện tiên quyết để nghiệm thu `TC-POST-08` và `TC-POST-09`. |
| **GAP-04** | Bổ sung xử lý query tìm kiếm không dấu và phân trang vào route `/api/dishes` (`BE05`) | TV4 | Điều kiện tiên quyết để nghiệm thu `TC-DISH-02`, `TC-DISH-03`, `TC-DISH-04`. |
