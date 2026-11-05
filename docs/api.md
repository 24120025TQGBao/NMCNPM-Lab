# API Contract - Dự án "Hôm nay ăn gì?" (Sprint 1 MVP)

> **Trạng thái:** Bản chốt chính thức cho Sprint 1 (Hạn chót: 05/11/2026).  
> **Áp dụng cho:** Frontend (TV2), Backend (TV1 + TV4), DevOps & QA (TV5).

---

## 1. Khác biệt so với bản nháp ban đầu
- **Tương thích tên trường cơ sở dữ liệu:** CSDL khởi tạo của nhóm đang dùng tiếng Việt (`mon_an`, `nguoi_dung`). Contract API vẫn giữ chuẩn `snake_case` tiếng Anh (`dish`, `author`, `ingredients`, `steps`) để Frontend code sạch sẽ, backend sẽ đảm nhiệm mapper chuyển đổi dữ liệu.
- **Thống nhất endpoint kiểm tra sức khỏe:** Cung cấp `GET /health` (và alias `GET /api/health` để tương thích Vite proxy / hệ thống cũ).
- **Thống nhất chuẩn phản hồi lỗi:** Tất cả lỗi thống nhất gói trong cấu trúc `{ "error": { "code": "...", "message": "...", "details": [...] } }`.

---

## 2. Quy ước chung

- **Base URL Dev:** `http://localhost:4000` (hoặc proxy qua Frontend `http://localhost:5173/api`).
- **Tất cả endpoint nghiệp vụ** đều nằm dưới tiền tố `/api`.
- **Định dạng dữ liệu:** JSON, UTF-8. Header bắt buộc: `Content-Type: application/json`.
- **Định dạng thời gian:** Chuẩn ISO 8601 UTC (ví dụ: `2026-11-06T09:30:00.000Z`).
- **Định dạng định danh (ID):** Chuỗi UUID v4 chuẩn (ví dụ: `11111111-1111-1111-1111-111111111111`).
- **Xác thực:** Gửi qua HTTP Header:  
  `Authorization: Bearer <access_token>`  
  *(Token do Supabase Auth cấp trực tiếp cho Frontend sau khi đăng nhập).*

### 2.1. Cấu trúc Response thành công

- **Đối tượng đơn lẻ:**
```json
{
  "data": { }
}
```

- **Danh sách có phân trang:**
```json
{
  "data": [ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 37
  }
}
```

### 2.2. Cấu trúc Response lỗi (Thống nhất toàn hệ thống)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "ingredients[0].quantity",
        "message": "Định lượng phải là số lớn hơn 0"
      }
    ]
  }
}
```

*Lưu ý: Mảng `details` chỉ xuất hiện khi `code` là `VALIDATION_ERROR`.*

#### Bảng mã lỗi chuẩn HTTP:

| HTTP Status | Mã lỗi (`code`) | Ý nghĩa & Khi nào trả về |
|---|---|---|
| **400** | `VALIDATION_ERROR` | Dữ liệu gửi lên sai/thiếu trường bắt buộc, sai kiểu dữ liệu, ID sai định dạng UUID. |
| **401** | `UNAUTHORIZED` | Thiếu token, token không hợp lệ hoặc đã hết hạn. |
| **403** | `FORBIDDEN` | Tài khoản bị vô hiệu hóa hoặc không có quyền truy cập tài nguyên. |
| **404** | `NOT_FOUND` | Không tìm thấy bài viết, tài nguyên hoặc endpoint không tồn tại. |
| **500** | `INTERNAL_ERROR` | Lỗi máy chủ nội bộ. Message chung chung, **không để lộ stack trace hay câu lệnh SQL**. |

### 2.3. Quy tắc phân trang (Pagination)
- **Tham số Query:**
  - `page`: Số trang (mặc định: `1`, tối thiểu: `1`).
  - `limit`: Số bản ghi mỗi trang (mặc định: `20`, tối thiểu: `1`, **tối đa: `50`**).
- Truyền sai kiểu hoặc vượt quá giới hạn sẽ trả lỗi `400 VALIDATION_ERROR`.

---

## 3. Chi tiết các Endpoints

### 3.1. `GET /health` (hoặc `GET /api/health`)
- **Mục đích:** Kiểm tra trạng thái hoạt động của backend service.
- **Quyền:** Công khai (Public).
- **Response (200 OK):**
```json
{
  "status": "ok"
}
```

---

### 3.2. `POST /api/posts` (Tạo bài viết công thức)
- **Mục đích:** Người dùng đã đăng nhập đăng bài công thức món ăn (Phương án A - cấu trúc).
- **Phụ trách:** TV1 (BE03).
- **Quyền:** Cần đăng nhập (`Authorization: Bearer <access_token>`).
- **Lưu ý bảo mật:** Người đăng (`author_id`) **luôn được trích xuất từ token**, backend bỏ qua mọi trường `author_id`/`user_id` nếu client truyền trong body.

#### Request Body:
```json
{
  "dish_id": "11111111-1111-1111-1111-111111111111",
  "title": "Phở bò nhà làm, nước dùng trong",
  "ingredients": [
    {
      "ingredient_id": "22222222-2222-2222-2222-222222222222",
      "quantity": 500,
      "unit": "g"
    },
    {
      "name": "hành tây",
      "quantity": 1,
      "unit": "củ"
    },
    {
      "name": "muối",
      "quantity": null,
      "unit": null
    }
  ],
  "steps": [
    {
      "content": "Chần xương với nước sôi 5 phút rồi rửa sạch."
    },
    {
      "content": "Hầm xương 3 tiếng với hành, gừng nướng."
    }
  ]
}
```

#### Quy tắc Validation:
| Trường | Bắt buộc | Quy tắc xác thực |
|---|---|---|
| `dish_id` | Có | UUID hợp lệ. Món ăn phải tồn tại trong CSDL. |
| `title` | Có | Chuỗi từ 3 đến 150 ký tự (sau khi trim khoảng trắng). |
| `ingredients` | Có | Mảng từ 1 đến 50 phần tử. |
| `ingredients[].ingredient_id` / `.name` | Có | **Phải có ít nhất 1 trong 2**. Nếu có cả hai, ưu tiên `ingredient_id`. `name` dài từ 1 đến 100 ký tự. |
| `ingredients[].quantity` | Không | Số thực dương (`> 0`) hoặc `null` (nêm nếm tùy khẩu vị). Không nhận chuỗi. |
| `ingredients[].unit` | Không | Chuỗi từ 1 đến 30 ký tự hoặc `null`. |
| `steps` | Có | Mảng từ 1 đến 50 phần tử. |
| `steps[].content` | Có | Chuỗi từ 1 đến 1000 ký tự. Thứ tự bước tự động đánh số 1, 2, 3... theo mảng. |

#### Response (201 Created):
Trả về đối tượng bài viết vừa tạo hoàn chỉnh (cùng định dạng với `GET /api/posts/:id`) để Frontend hiển thị hoặc redirect:
```json
{
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "title": "Phở bò nhà làm, nước dùng trong",
    "created_at": "2026-11-06T09:30:00.000Z",
    "dish": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Phở bò"
    },
    "author": {
      "id": "44444444-4444-4444-4444-444444444444",
      "display_name": "Minh"
    },
    "ingredients": [
      {
        "ingredient_id": "22222222-2222-2222-2222-222222222222",
        "name": "thịt bò",
        "quantity": 500,
        "unit": "g"
      },
      {
        "ingredient_id": "55555555-5555-5555-5555-555555555555",
        "name": "muối",
        "quantity": null,
        "unit": null
      }
    ],
    "steps": [
      {
        "order": 1,
        "content": "Chần xương với nước sôi 5 phút rồi rửa sạch."
      },
      {
        "order": 2,
        "content": "Hầm xương 3 tiếng với hành, gừng nướng."
      }
    ]
  }
}
```

---

### 3.3. `GET /api/posts` (Bảng tin danh sách bài viết)
- **Mục đích:** Xem danh sách bài viết công khai trên bảng tin, sắp xếp mới nhất trước.
- **Phụ trách:** TV1 (BE04).
- **Quyền:** Công khai (Public).
- **Query Params:**
  - `page`: Số trang (mặc định: `1`).
  - `limit`: Số bài mỗi trang (mặc định: `20`, tối đa: `50`).

#### Response (200 OK):
```json
{
  "data": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "title": "Phở bò nhà làm, nước dùng trong",
      "created_at": "2026-11-06T09:30:00.000Z",
      "dish": {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Phở bò"
      },
      "author": {
        "id": "44444444-4444-4444-4444-444444444444",
        "display_name": "Minh"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 37
  }
}
```
*Lưu ý: Nếu không có bài viết nào, trả về `"data": []` kèm mã HTTP `200`, không trả về 404.*

---

### 3.4. `GET /api/posts/:id` (Chi tiết bài viết)
- **Mục đích:** Xem đầy đủ công thức, nguyên liệu và các bước thực hiện của một bài viết.
- **Phụ trách:** TV1 (BE04).
- **Quyền:** Công khai (Public).
- **Path Params:**
  - `id`: UUID của bài viết.

#### Response (200 OK):
```json
{
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "title": "Phở bò nhà làm, nước dùng trong",
    "created_at": "2026-11-06T09:30:00.000Z",
    "dish": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Phở bò"
    },
    "author": {
      "id": "44444444-4444-4444-4444-444444444444",
      "display_name": "Minh"
    },
    "ingredients": [
      {
        "ingredient_id": "22222222-2222-2222-2222-222222222222",
        "name": "thịt bò",
        "quantity": 500,
        "unit": "g"
      },
      {
        "ingredient_id": "55555555-5555-5555-5555-555555555555",
        "name": "muối",
        "quantity": null,
        "unit": null
      }
    ],
    "steps": [
      {
        "order": 1,
        "content": "Chần xương với nước sôi 5 phút rồi rửa sạch."
      },
      {
        "order": 2,
        "content": "Hầm xương 3 tiếng với hành, gừng nướng."
      }
    ]
  }
}
```
- Lỗi `400 VALIDATION_ERROR`: `:id` không phải UUID hợp lệ.
- Lỗi `404 NOT_FOUND`: Không tìm thấy bài viết tương ứng với `:id`.

---

### 3.5. `GET /api/dishes` (Tra cứu danh mục món ăn)
- **Mục đích:** Cung cấp danh sách món ăn mẫu để Frontend hiển thị gợi ý (autocomplete/select) khi tạo bài viết.
- **Phụ trách:** TV4 (BE05).
- **Quyền:** Công khai (Public).
- **Query Params:**
  - `search` (tùy chọn): Từ khóa tìm kiếm theo tên món ăn.
  - `page` (tùy chọn): Trang hiện tại (mặc định: `1`).
  - `limit` (tùy chọn): Giới hạn mỗi trang (mặc định: `20`, tối đa: `50`).

#### Response (200 OK):
```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Phở bò"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## 4. Quy tắc quản lý & thay đổi Contract
1. **Tính bất biến trong Sprint:** Contract này là cam kết giữa Frontend, Backend và QA. Bất kỳ sự thay đổi nào đối với tên trường, cấu trúc trả về hoặc mã lỗi đều **không được tự ý thay đổi**.
2. **Quy trình thay đổi nếu bắt buộc:**
   - Người đề xuất phải thông báo trước cho TV1 (PO/Backend Lead) và TV2 (Frontend Lead).
   - Ghi lại lý do và cập nhật vào mục *Lịch sử thay đổi* ở cuối tài liệu này.
   - Tạo thông báo chính thức cho toàn bộ thành viên nhóm.

---

## 5. Danh sách câu hỏi còn mở (Cần xác nhận với TV3)

| # | Câu hỏi | Người phụ trách | Đề xuất mặc định của Backend |
|---|---|---|---|
| 1 | Kiểu dữ liệu ID trong toàn bộ bảng là UUID v4 hay `BIGINT` tự tăng? | TV3 | Mặc định sử dụng **UUID v4** |
| 2 | Khi người dùng gõ tay nguyên liệu chưa có trong danh mục: Hệ thống sẽ tự tạo mới hay lưu kèm cờ `is_verified: false`? | TV3 + TV4 | Tự động tạo nguyên liệu mới vào bảng nguyên liệu nếu chưa tồn tại |
| 3 | Bài viết có cột trạng thái (`status` hoặc `is_public`) không? | TV3 | Mặc định **không có**, mọi bài viết được tạo thành công đều công khai ngay |
| 4 | Định lượng nguyên liệu (`quantity`) có thể để trống (`null`) đối với gia vị nêm nếm không? | TV3 | **Cho phép `null`** |
| 5 | Tên và chữ ký chính xác của hàm RPC Postgres (DB09) lưu bài viết trong 1 transaction là gì? | TV3 | Giả định: `create_post_with_recipe(dish_id, title, ingredients, steps)` |

