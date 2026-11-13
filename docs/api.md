# API Contract - "Hôm nay ăn gì?" (Sprint 1)

> **Trạng thái:** Bản chốt Sprint 1, khớp schema Supabase thực tế (đối chiếu ngày 11/11/2026).
> **Áp dụng cho:** Frontend (TV2), Backend (TV1, TV4), Database (TV3), QA/DevOps (TV5).

---

## 1. Quy ước chung

- **Base URL (dev):** `http://localhost:3000`. Frontend gọi qua Vite proxy `/api`.
- Mọi endpoint nghiệp vụ nằm dưới tiền tố `/api`.
- **Định dạng dữ liệu:** JSON, UTF-8, header `Content-Type: application/json`.
- **Thời gian:** ISO 8601 UTC, ví dụ `2026-11-11T09:30:00.000Z`.
- **ID:**
  - `post.id`, `dish.id`, `ingredient_id` là **số nguyên** (khớp `bigint` trong DB), ví dụ `17`.
  - `author.id` là **UUID** (khớp `nguoi_dung.ma_nd`).
- **Xác thực:** header `Authorization: Bearer <access_token>` (token do Supabase Auth cấp).
- **Tên trường JSON** dùng `snake_case` tiếng Anh. Backend chịu trách nhiệm ánh xạ sang cột DB (xem mục 5).

### 1.1. Response thành công

Đối tượng đơn lẻ:
```json
{ "data": { } }
```

Danh sách có phân trang:
```json
{ "data": [ ], "meta": { "page": 1, "limit": 20, "total": 37 } }
```

### 1.2. Response lỗi

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      { "field": "ingredients[0].quantity", "message": "Định lượng phải là số lớn hơn 0" }
    ]
  }
}
```
Mảng `details` chỉ có khi `code` là `VALIDATION_ERROR`.

| HTTP | `code` | Khi nào trả về |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu trường, sai kiểu, sai giá trị, ID không phải số nguyên dương, nguyên liệu trùng trong cùng công thức, JSON sai cú pháp. |
| 401 | `UNAUTHORIZED` | Thiếu token, token sai hoặc hết hạn. |
| 403 | `FORBIDDEN` | Tài khoản `LOCKED` hoặc chưa có profile hợp lệ. |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên hoặc endpoint không tồn tại. |
| 500 | `INTERNAL_ERROR` | Lỗi máy chủ. Message chung chung, không lộ stack trace hay SQL. |

### 1.3. Phân trang

- `page`: mặc định `1`, tối thiểu `1`.
- `limit`: mặc định `20`, tối thiểu `1`, tối đa `50`.
- Sai kiểu hoặc vượt giới hạn trả `400 VALIDATION_ERROR`.

---

## 2. Endpoints

### 2.1. `GET /api/health`
- Quyền: công khai.
- Response `200`: `{ "status": "ok" }`

---

### 2.2. `POST /api/posts` — Tạo bài viết công thức

- Quyền: **cần đăng nhập**.
- `author` luôn lấy từ token. Mọi trường `author_id`, `user_id` trong body bị bỏ qua.
- Backend luôn ghi `loai_bai = 'RECIPE'` và `trang_thai = 'PUBLIC'`.
- Một request tạo đồng thời `cong_thuc`, `ct_nguyen_lieu`, `buoc_cong_thuc`, `bai_dang` trong một transaction.

#### Request body
```json
{
  "dish_id": 17,
  "title": "Phở bò nhà làm, nước dùng trong",
  "content": "Công thức nấu phở bò nước trong, ngọt xương.",
  "ingredients": [
    { "ingredient_id": 100, "quantity": 500, "unit": "g", "role": "PRIMARY" },
    { "name": "hành tây", "quantity": 1, "unit": "củ" },
    { "name": "muối", "quantity": null, "unit": null }
  ],
  "steps": [
    { "content": "Chần xương với nước sôi 5 phút rồi rửa sạch." },
    { "content": "Hầm xương 3 tiếng với hành, gừng nướng." }
  ]
}
```

#### Validation

| Trường | Bắt buộc | Quy tắc | Cột DB |
|---|---|---|---|
| `dish_id` | Có | Số nguyên dương, món phải tồn tại và `ACTIVE`. | `cong_thuc.ma_mon` |
| `title` | Có | 3–150 ký tự sau khi trim. | `bai_dang.tieu_de`, `cong_thuc.ten_ct` |
| `content` | Không | 1–2000 ký tự sau khi trim. Nếu không gửi, backend dùng `title`. | `bai_dang.noi_dung` |
| `ingredients` | Có | Mảng 1–50 phần tử. | `ct_nguyen_lieu` |
| `ingredients[].ingredient_id` / `.name` | Có ít nhất 1 trong 2 | Có cả hai thì ưu tiên `ingredient_id`. `name` 1–100 ký tự. Nguyên liệu không được trùng trong cùng công thức. | `ct_nguyen_lieu.ma_nl`, `nguyen_lieu.ten_nl` |
| `ingredients[].quantity` | Không | Số `> 0` hoặc `null`. Không nhận chuỗi. | `ct_nguyen_lieu.so_luong` |
| `ingredients[].unit` | Không | Chuỗi 1–30 ký tự hoặc `null`. | `ct_nguyen_lieu.don_vi` |
| `ingredients[].role` | Không | `PRIMARY` hoặc `SECONDARY`. Mặc định `SECONDARY`. | `ct_nguyen_lieu.vai_tro_nl` |
| `steps` | Có | Mảng 1–50 phần tử. | `buoc_cong_thuc` |
| `steps[].content` | Có | 1–1000 ký tự sau khi trim. Thứ tự (`order`) do backend tự đánh số 1, 2, 3... theo thứ tự mảng. | `buoc_cong_thuc.noi_dung`, `stt` |

**Xử lý nguyên liệu gõ tay (`name`):** backend so khớp `ten_nl` không phân biệt hoa thường sau khi trim. Có thì dùng nguyên liệu đó, chưa có thì tự tạo mới trong `nguyen_lieu`.

#### Response `201 Created`
Trả cùng cấu trúc với `GET /api/posts/:id`:
```json
{
  "data": {
    "id": 51,
    "title": "Phở bò nhà làm, nước dùng trong",
    "content": "Công thức nấu phở bò nước trong, ngọt xương.",
    "created_at": "2026-11-11T09:30:00.000Z",
    "dish": { "id": 17, "name": "Chả trứng" },
    "author": { "id": "44444444-4444-4444-4444-444444444444", "display_name": "Minh" },
    "ingredients": [
      { "ingredient_id": 100, "name": "Gầu bò", "quantity": 500, "unit": "g", "role": "PRIMARY" },
      { "ingredient_id": 210, "name": "hành tây", "quantity": 1, "unit": "củ", "role": "SECONDARY" },
      { "ingredient_id": 211, "name": "muối", "quantity": null, "unit": null, "role": "SECONDARY" }
    ],
    "steps": [
      { "order": 1, "content": "Chần xương với nước sôi 5 phút rồi rửa sạch." },
      { "order": 2, "content": "Hầm xương 3 tiếng với hành, gừng nướng." }
    ]
  }
}
```

#### Lỗi
- `400`: dữ liệu sai (xem bảng validation), `dish_id` không tồn tại, nguyên liệu trùng.
- `401`: thiếu hoặc sai token.
- `403`: tài khoản `LOCKED`.
- `500`: lỗi máy chủ.

---

### 2.3. `GET /api/posts` — Danh sách bài viết

- Quyền: công khai.
- Chỉ trả bài có `loai_bai = 'RECIPE'` và `trang_thai = 'PUBLIC'`, sắp xếp mới nhất trước (`tao_luc` giảm dần).
- Query: `page`, `limit` (xem mục 1.3).

#### Response `200`
```json
{
  "data": [
    {
      "id": 51,
      "title": "Phở bò nhà làm, nước dùng trong",
      "created_at": "2026-11-11T09:30:00.000Z",
      "dish": { "id": 17, "name": "Chả trứng" },
      "author": { "id": "44444444-4444-4444-4444-444444444444", "display_name": "Minh" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 37 }
}
```
Không có bài nào thì trả `"data": []` với mã `200`.

Lỗi: `400` (page/limit sai), `500`.

---

### 2.4. `GET /api/posts/:id` — Chi tiết bài viết

- Quyền: công khai.
- `:id` là số nguyên dương.
- Chỉ trả bài `RECIPE` + `PUBLIC`. Bài ở trạng thái khác hoặc loại `REVIEW` trả `404`.

#### Response `200`
Cấu trúc giống response `201` của `POST /api/posts` (mục 2.2).

Lỗi:
- `400`: `:id` không phải số nguyên dương.
- `404`: không tìm thấy bài viết.
- `500`: lỗi máy chủ.

---

### 2.5. `GET /api/dishes` — Tra cứu món ăn (TV4)

- Quyền: công khai.
- Chỉ trả món có `trang_thai = 'ACTIVE'`, sắp xếp theo `name` tăng dần.

#### Query
| Tham số | Mô tả |
|---|---|
| `search` | Tùy chọn. Tìm theo tên món, không phân biệt hoa thường. |
| `ingredients` | Tùy chọn (P1, API-02). Danh sách `ingredient_id` cách nhau bằng dấu phẩy, ví dụ `ingredients=1,5,9`. Trả các món có công thức chứa **tất cả** nguyên liệu đó. Kết hợp được với `search`. Giá trị không phải số nguyên dương trả `400`. Tối đa 20 ID. |
| `page`, `limit` | Xem mục 1.3. |

#### Response `200`
```json
{
  "data": [
    {
      "id": 17,
      "name": "Chả trứng",
      "description": "Mô tả ngắn hoặc null",
      "image_url": null
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

Lỗi: `400`, `500`.

---

## 3. Quy tắc thay đổi contract

1. Contract không được tự ý thay đổi tên trường, cấu trúc response hoặc mã lỗi.
2. Muốn thay đổi: báo trước cho TV1 (PO/Backend Lead) và TV2 (Frontend Lead), ghi lý do vào mục "Lịch sử thay đổi", rồi thông báo cho cả nhóm.

---

## 4. Lịch sử thay đổi

| Ngày | Phiên bản | Người đổi | Nội dung |
|---|---|---|---|
| 11/11/2026 | 1.0 | TV1 | Chốt bản Sprint 1 theo schema Supabase thực tế (ID bigint, bảng `bai_dang`/`cong_thuc`, thêm `content`, `role`, tham số `ingredients`). |

---

## 5. Ánh xạ JSON ↔ Database

| JSON | Bảng.cột DB |
|---|---|
| `dish.id`, `dish.name`, `description`, `image_url` | `mon_an.ma_mon`, `ten_mon`, `mo_ta_ngan`, `hinh_anh` |
| `author.id`, `author.display_name` | `nguoi_dung.ma_nd`, `ten_hien_thi` |
| `post.id`, `title`, `content`, `created_at` | `bai_dang.ma_bai`, `tieu_de`, `noi_dung`, `tao_luc` |
| `post.dish` | `bai_dang.ma_ct` → `cong_thuc.ma_mon` → `mon_an` |
| `ingredients[]` | `ct_nguyen_lieu` (`so_luong`, `don_vi`, `vai_tro_nl`) + `nguyen_lieu` (`ma_nl`, `ten_nl`) |
| `steps[]` | `buoc_cong_thuc` (`stt` → `order`, `noi_dung` → `content`) |

Không trả email, số điện thoại hoặc dữ liệu nhạy cảm của người dùng qua API công khai.

---

## 6. Việc còn mở

| # | Nội dung | Người phụ trách |
|---|---|---|
| 1 | Viết hàm RPC Postgres tạo bài trong một transaction (DB chưa có). | TV1 soạn SQL, TV3 chạy |
| 2 | Xác nhận RLS cho phép backend đọc/ghi `bai_dang`, `cong_thuc`, `ct_nguyen_lieu`, `buoc_cong_thuc`, `nguyen_lieu`. | TV3 |