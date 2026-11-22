# API Contract - "Hôm nay ăn gì?" (Sprint 1–2)

> **Trạng thái:** Mục 1–6: bản chốt Sprint 1 (v1.0), khớp schema Supabase thực tế (đối chiếu ngày 11/11/2026). **Mục 7: bản nháp Sprint 2 (v2.0), chờ TV2, TV3, TV4 xác nhận.**
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
| 403 | `FORBIDDEN` | Tài khoản bị khóa hoặc không được phép truy cập. |
| 409 | `PROFILE_NOT_FOUND` | Tài khoản đã xác thực nhưng chưa có hồ sơ trong `nguoi_dung`. |
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

### 2.6. `GET /api/me` — Hồ sơ người dùng hiện tại

- Quyền: cần đăng nhập; backend lấy `ma_nd` từ access token đã xác thực, không nhận user ID từ query/body.
- Response `200`: trả trực tiếp hồ sơ theo các cột DB để tương thích với Frontend hiện tại; không trả email hoặc dữ liệu nhạy cảm.

```json
{
  "ma_nd": "44444444-4444-4444-4444-444444444444",
  "ten_hien_thi": "Minh",
  "anh_dai_dien": null,
  "vai_tro": "USER",
  "trang_thai": "ACTIVE"
}
```

Lỗi:
- `401 UNAUTHORIZED`: thiếu token, token sai hoặc hết hạn.
- `403 FORBIDDEN`: hồ sơ không ở trạng thái `ACTIVE`.
- `409 PROFILE_NOT_FOUND`: tài khoản đã xác thực nhưng chưa có hồ sơ.
- `500 INTERNAL_ERROR`: lỗi khi đọc hồ sơ.

---

## 3. Quy tắc thay đổi contract

1. Contract không được tự ý thay đổi tên trường, cấu trúc response hoặc mã lỗi.
2. Muốn thay đổi: báo trước cho TV1 (PO/Backend Lead) và TV2 (Frontend Lead), ghi lý do vào mục "Lịch sử thay đổi", rồi thông báo cho cả nhóm.

---

## 4. Lịch sử thay đổi

| Ngày | Phiên bản | Người đổi | Nội dung |
|---|---|---|---|
| 11/11/2026 | 1.0 | TV1 | Chốt bản Sprint 1 theo schema Supabase thực tế (ID bigint, bảng `bai_dang`/`cong_thuc`, thêm `content`, `role`, tham số `ingredients`). |
| 22/11/2026 | 2.0 | TV1 | Thêm endpoint Sprint 2 (mục 7). Bản nháp, chờ TV2/TV3/TV4 xác nhận. Mục 1–2 giữ nguyên. |

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
| 1 | Áp dụng và kiểm thử `create_post_with_recipe` trên staging; SQL đã có trong repo nhưng chưa xác nhận trạng thái DB. | TV3 |
| 2 | Chạy `supabase/grant_service_role_profile_read.sql` trên staging; xác nhận quyền `service_role` đọc `nguoi_dung` và quyền RPC cho các luồng bài viết. | TV3 |

---

## 7. Sprint 2 — Gợi ý, đối sánh nguyên liệu, tìm món, công thức (v2.0, bản nháp)

> Mục 7 được thêm sau mục 1–6 để không đổi số mục của bản v1.0 (các tài liệu khác đang tham chiếu "mục 5"). Mục 1–2 không đổi và vẫn áp dụng.
> Chỗ ghi `TODO(DB10)`, `TODO(DB11)`, `TODO(DB12)` là phần phụ thuộc SQL của TV3 chưa có trong `supabase/`; không suy đoán tên bảng, cột, RPC.
> Quy tắc xếp mức sẵn sàng nếu khác RPC DB12 thì **RPC thắng**, mục này sẽ sửa theo RPC.

### 7.0. Quy ước chung Sprint 2

- **Mọi endpoint mục 7 đều công khai**, không cần đăng nhập. Header `Authorization` nếu có thì bị bỏ qua.
- Key JSON **tiếng Anh `snake_case`**. Envelope và format lỗi như mục 1.1 và 1.2 (`VALIDATION_ERROR` kèm `details`, `NOT_FOUND`, `INTERNAL_ERROR`).
- Chỉ trả món có `trang_thai = 'ACTIVE'`. Món `HIDDEN`/`DELETED` luôn như không tồn tại (404 khi truy cập theo ID).
- **Tham số dạng CSV** (`exclude`, `the`, `ingredients`): các phần tử cách nhau bằng dấu phẩy, không có khoảng trắng. Chuỗi rỗng (`exclude=`) coi như không gửi, **không** trả 400. Phần tử rỗng ở giữa (`1,,2`) trả 400.
- **Danh sách ID** trong CSV: số nguyên dương, loại trùng trước khi xử lý.
- **Mã (code):** chữ in hoa, số và `_` (ví dụ `TROI_MUA`, `MAN`, `BAC`). Mã không nằm trong tập cho phép trả 400.
- **Mã tag hoàn cảnh** (chip tab Gợi ý, theo tag DB10): `TROI_MUA`, `LUOI_NAU`, `CUOI_THANG`, `NAU_CHO_4`, `AN_NHE`. Tập chính thức lấy từ bảng tag của DB10 `TODO(DB10)`.
- **Mã khẩu vị:** `MAN`, `CAY`, `NGOT`, `CHUA`, `THANH`. **Mã vùng miền:** `BAC`, `TRUNG`, `NAM`. `TODO(DB10)` xác nhận tập giá trị lưu trong DB.
- Endpoint trả danh sách **không phân trang** (`suggestions`, `ingredients`, `dishes/match`, `suggest-next`) dùng envelope `{ "data": [ ] }`, không có `meta`. `GET /api/dishes` và `GET /api/dishes/:id/recipes` giữ phân trang mục 1.3.
- **Thứ tự đăng ký route (backend):** `GET /api/dishes/match` và `GET /api/ingredients/suggest-next` phải đăng ký trước các route có `:id` cùng tiền tố, nếu không `match` bị hiểu là ID và trả 400.

Bảng endpoint:

| Endpoint | Ưu tiên | Task |
|---|---|---|
| `GET /api/suggestions` (7.1) | P0 | BE08 |
| `GET /api/ingredients` (7.2) | P0 | BE11 |
| `GET /api/dishes/match` (7.3) | P0 | BE10 |
| `GET /api/dishes` mở rộng (7.4) | P0 | BE09 |
| `GET /api/dishes/:id` (7.5) | P0 | BE09 |
| `GET /api/dishes/:id/recipes` (7.6) | P0 | BE09 |
| `GET /api/recipes/:id` (7.7) | P0 | BE09 |
| `GET /api/ingredients/suggest-next` (7.8) | P1 | BE12 |

---

### 7.1. `GET /api/suggestions` — Gợi ý món (tab Gợi ý món)

- Không bắt buộc nhập nguyên liệu hay sở thích.
- Chỉ lấy món `ACTIVE`. Lọc theo **tất cả** mã trong `the` (điều kiện AND). **Không bao giờ tự bỏ hay nới điều kiện** khi hết món (QĐ 1.2).
- Loại các món có ID trong `exclude` (QĐ 1.1).
- `random=true`: chọn ngẫu nhiên trong tập món thỏa điều kiện (vẫn áp dụng `the`, `vung_mien`, `exclude`). Ngược lại sắp xếp ổn định theo `id` tăng dần.
- Mỗi lần gọi trả tối đa `limit` món khác nhau.

#### Query

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `exclude` | Không | CSV ID món đã xuất hiện trong phiên. Tối đa 200 ID. |
| `the` | Không | CSV mã tag hoàn cảnh. Tối đa 5 mã. Mã lạ → 400. |
| `random` | Không | `true` hoặc `false`. Mặc định `false`. Giá trị khác → 400. |
| `limit` | Không | Số nguyên 1–10. Mặc định `1`. Ngoài khoảng → 400. |
| `vung_mien` | Không | (P1) `BAC`, `TRUNG` hoặc `NAM`. Mã lạ → 400. Kết hợp AND với `the`. |

#### Response `200`
```json
{
  "data": [
    {
      "id": 12,
      "name": "Canh chua cá lóc",
      "short_description": "Canh chua thanh mát, hợp ngày nóng.",
      "image_url": null,
      "cook_time_minutes": 30,
      "flavor": "CHUA",
      "tags": ["TROI_MUA", "NAU_CHO_4"],
      "region": "NAM"
    }
  ]
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | integer | Mã món. |
| `name` | string | |
| `short_description` | string \| null | Cùng nguồn với `description` ở `GET /api/dishes`; tên khác nhau là có chủ đích (frontend đang đọc `short_description` cho gợi ý). |
| `image_url` | string \| null | |
| `cook_time_minutes` | integer \| null | Thời gian chế biến cả món. `TODO(DB10)` nguồn dữ liệu. |
| `flavor` | string \| null | Một mã khẩu vị. |
| `tags` | string[] | Mã tag của món; mảng rỗng nếu không có. |
| `region` | string \| null | `BAC`/`TRUNG`/`NAM`. |

Hết món thỏa điều kiện: **`200` + `"data": []`**.

Lỗi: `400` (tham số sai), `500`.

---

### 7.2. `GET /api/ingredients` — Tìm nguyên liệu (autocomplete)

- Tìm **không phân biệt hoa thường, không phân biệt dấu** (`ca chua` → `Cà chua`) và **qua từ đồng nghĩa** (`hành xanh` → `Hành lá`). Dùng hàm/cột/bảng của DB11, không tự bỏ dấu trong Node `TODO(DB11)`.
- Kết quả trả về là nguyên liệu **chuẩn** (id và tên chuẩn), không lặp nguyên liệu khi khớp nhiều cách.
- Chỉ trả nguyên liệu có trong từ điển hệ thống.

#### Query

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `search` | **Có** | 1–50 ký tự sau khi trim. Thiếu hoặc rỗng → 400. |
| `limit` | Không | Số nguyên 1–20. Mặc định `8`. Ngoài khoảng → 400. |

#### Response `200`
```json
{
  "data": [
    { "id": 5, "name": "Cà chua", "is_basic_pantry": false }
  ]
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | integer | Mã nguyên liệu (`ingredient_id` ở các endpoint khác). |
| `name` | string | Tên chuẩn. |
| `is_basic_pantry` | boolean | `true` nếu thuộc tủ bếp cơ bản (muối, đường, dầu ăn, nước mắm, tiêu). `TODO(DB10)` cột nguồn. |

Không thấy: **`200` + `"data": []`**. Thứ tự: nguyên liệu khớp tên đứng trước khớp từ đồng nghĩa, sau đó theo tên tăng dần `TODO(DB11)` xác nhận cách xếp.

Lỗi: `400`, `500`.

---

### 7.3. `GET /api/dishes/match` — Đối sánh nguyên liệu (tab Theo nguyên liệu)

- Cần **ít nhất 1 nguyên liệu hợp lệ** (QĐ 4.1).
- Tính đối sánh bằng RPC của DB12, **không** viết logic đối sánh trong Node `TODO(DB12)`.
- Mỗi món một dòng. Sắp xếp **do API quyết định** (theo `match_ratio` giảm dần); frontend giữ nguyên thứ tự và không tính lại.
- Frontend chia 4 nhóm; API chỉ trả `readiness` (3 giá trị) và `is_incomplete`. Món `is_incomplete = true` được frontend xếp vào nhóm "Chưa đủ dữ liệu để kết luận" bất kể `readiness`.

#### Query

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `ingredients` | **Có** | CSV ID nguyên liệu, 1–30 ID. Thiếu, rỗng, hoặc không có ID nào tồn tại → 400. |
| `pantry` | Không | `true` hoặc `false`. Mặc định `true`. Khi `true`, nguyên liệu có `is_basic_pantry` được coi là đã có. Giá trị khác → 400. |

#### Response `200`
```json
{
  "data": [
    {
      "id": 7,
      "name": "Trứng chiên cà chua",
      "image_url": null,
      "match_ratio": 0.78,
      "have_count": 5,
      "total_count": 7,
      "missing": [
        { "id": 3, "name": "Hành lá", "role": "SECONDARY" },
        { "id": 9, "name": "Nước mắm", "role": "SECONDARY" }
      ],
      "readiness": "MISSING_1_2",
      "is_incomplete": false
    }
  ]
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `match_ratio` | number 0–1 | Tỷ lệ khớp **có trọng số** theo vai trò chính/phụ (QĐ 4.2). Trọng số theo RPC `TODO(DB12)`. |
| `have_count` | integer | Số nguyên liệu của công thức đã có (tính cả tủ bếp cơ bản khi `pantry=true`). |
| `total_count` | integer | Tổng số nguyên liệu của công thức. Luôn có `have_count + missing.length = total_count`. |
| `missing` | array | Nguyên liệu còn thiếu: `id`, `name`, `role` (`PRIMARY` \| `SECONDARY`). Mảng rỗng nếu không thiếu gì. |
| `readiness` | string | `READY` \| `MISSING_1_2` \| `NEED_SHOPPING`. |
| `is_incomplete` | boolean | Công thức thiếu thành phần (QĐ 4.4). Nguồn dự kiến: `cong_thuc.trang_thai_thanh_phan = 'INCOMPLETE'`, `TODO(DB12)` xác nhận. |

**Quy tắc `readiness`** (tạm thời, chốt theo RPC DB12):
- Thiếu 0 nguyên liệu chính và 0 nguyên liệu phụ → `READY`.
- Tổng số nguyên liệu thiếu (chính + phụ) là 1 hoặc 2 → `MISSING_1_2`.
- Còn lại → `NEED_SHOPPING`.

Hệ số khớp `match_ratio` và con số `have_count/total_count` có thể không tương ứng nhau (ví dụ 5/7 nhưng 0.78); đó là thiết kế.

Không có món nào: **`200` + `"data": []`**.

Lỗi: `400`, `500`.

---

### 7.4. `GET /api/dishes` — Tìm và lọc món (mở rộng mục 2.5)

Giữ nguyên `search`, `ingredients`, `page`, `limit` và response như mục 2.5. Thêm các thay đổi sau (BE09):

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `search` | Không | **Nâng cấp:** không phân biệt hoa thường **và không phân biệt dấu** (`pho bo` tìm được `Phở bò`). `TODO(DB11)` cột/hàm dùng. |
| `the` | Không | CSV mã tag, điều kiện AND. Mã lạ → 400. |
| `flavor` | Không | Một mã khẩu vị (`MAN`, `CAY`, `NGOT`, `CHUA`, `THANH`). Mã lạ → 400. |
| `max_cook_time` | Không | Số nguyên 1–1440 (phút). Chỉ trả món có `cook_time_minutes ≤` giá trị này; món chưa có thời gian bị loại khi dùng bộ lọc này. |

Các bộ lọc kết hợp AND với nhau và với `search`, `ingredients`. Response mỗi phần tử như v1.0: `id`, `name`, `description`, `image_url`; `meta` có `total` đúng theo bộ lọc. Không có món: `200` + `"data": []`.

Lỗi: `400`, `500`.

---

### 7.5. `GET /api/dishes/:id` — Chi tiết món

- `:id` là số nguyên dương. Món không tồn tại hoặc không `ACTIVE` → `404`.

#### Response `200`
```json
{
  "data": {
    "id": 12,
    "name": "Canh chua cá lóc",
    "description": "Canh chua thanh mát, hợp ngày nóng.",
    "image_url": null,
    "cook_time_minutes": 30,
    "flavor": "CHUA",
    "tags": ["TROI_MUA", "NAU_CHO_4"],
    "region": "NAM",
    "recipes": [
      {
        "id": 31,
        "dish_id": 12,
        "name": "Canh chua cá lóc miền Tây",
        "servings": 4,
        "prep_time_minutes": 40,
        "ingredient_count": 9,
        "incomplete": false
      }
    ]
  }
}
```

- `recipes` dùng **cùng cấu trúc `RecipeSummary`** với mục 7.6. Món chưa có công thức: `"recipes": []`, vẫn là `200`.
- Chỉ liệt kê công thức công khai (xem câu hỏi Q3 mục 7.10), sắp xếp theo `id` tăng dần.

Lỗi: `400`, `404`, `500`.

---

### 7.6. `GET /api/dishes/:id/recipes` — Danh sách công thức của món

- Query `page`, `limit` (mục 1.3). Món không tồn tại hoặc không `ACTIVE` → `404`. Món chưa có công thức → `200` + `"data": []`.

**`RecipeSummary`:**

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | integer | Mã công thức. |
| `dish_id` | integer | |
| `name` | string | |
| `servings` | integer \| null | Khẩu phần. `null` = chưa có thông tin. `TODO(DB)`: schema 11/11/2026 chưa có cột khẩu phần (xem Q1). |
| `prep_time_minutes` | integer \| null | `null` = chưa có thông tin. |
| `ingredient_count` | integer | |
| `incomplete` | boolean | Công thức thiếu thành phần (QĐ 1.5, QĐ 4.4). |

```json
{
  "data": [
    { "id": 31, "dish_id": 12, "name": "Canh chua cá lóc miền Tây", "servings": 4, "prep_time_minutes": 40, "ingredient_count": 9, "incomplete": false }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

Lỗi: `400`, `404`, `500`.

---

### 7.7. `GET /api/recipes/:id` — Chi tiết công thức

- `:id` là số nguyên dương. Công thức không tồn tại, không công khai, hoặc thuộc món không `ACTIVE` → `404`.

#### Response `200`
```json
{
  "data": {
    "id": 31,
    "dish_id": 12,
    "name": "Canh chua cá lóc miền Tây",
    "servings": 4,
    "prep_time_minutes": 40,
    "incomplete": false,
    "ingredients": [
      { "ingredient_id": 100, "name": "Cá lóc", "quantity": 500, "unit": "g", "role": "PRIMARY" },
      { "ingredient_id": 211, "name": "Muối", "quantity": null, "unit": null, "role": "SECONDARY" }
    ],
    "steps": [
      { "order": 1, "content": "Sơ chế cá, ướp với chút muối." },
      { "order": 2, "content": "Nấu nước dùng, cho cá vào." }
    ]
  }
}
```

- `ingredients` cùng cấu trúc với `GET /api/posts/:id` (mục 2.2). `quantity` và `unit` là `null` nghĩa là **"tùy khẩu vị"**.
- `steps` sắp xếp theo `order` tăng dần, `order` bắt đầu từ 1.
- Không bịa giá trị khi thiếu dữ liệu: `servings` / `prep_time_minutes` là `null`, `incomplete = true` (QĐ 1.5).

Lỗi: `400`, `404`, `500`.

---

### 7.8. `GET /api/ingredients/suggest-next` — Nguyên liệu nên mua thêm (P1)

- Trả nguyên liệu mà nếu có thêm sẽ "mở khóa" nhiều món nhất. Dùng RPC DB12 `TODO(DB12)` (tên RPC và tham số).

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `ingredients` | **Có** | CSV ID nguyên liệu đang có, 1–30 ID. Thiếu, rỗng hoặc sai → 400. |

#### Response `200`
```json
{
  "data": [
    { "ingredient": { "id": 3, "name": "Hành lá" }, "unlock_count": 4, "dish_ids": [7, 12, 15, 21] }
  ]
}
```

Sắp xếp theo `unlock_count` giảm dần. Không có gợi ý: `200` + `"data": []`. Số phần tử tối đa `TODO(DB12)`.

Lỗi: `400`, `500`.

---

### 7.9. Ánh xạ JSON ↔ Database (Sprint 2)

Phần đã có trong schema Sprint 1 (xem `docs/schema-notes.md`):

| JSON | Bảng.cột DB |
|---|---|
| `id`, `name`, `description` / `short_description`, `image_url` (món) | `mon_an.ma_mon`, `ten_mon`, `mo_ta_ngan`, `hinh_anh`; lọc bằng `mon_an.trang_thai = 'ACTIVE'` |
| `recipes[].id`, `dish_id`, `name` | `cong_thuc.ma_ct`, `ma_mon`, `ten_ct` |
| `prep_time_minutes` | `cong_thuc.thoi_gian_phut` |
| `incomplete` | `cong_thuc.trang_thai_thanh_phan = 'INCOMPLETE'` |
| `ingredients[]` (công thức) | `ct_nguyen_lieu` (`so_luong`, `don_vi`, `vai_tro_nl`) + `nguyen_lieu` (`ma_nl`, `ten_nl`) |
| `steps[]` | `buoc_cong_thuc` (`stt` → `order`, `noi_dung` → `content`) |
| `ingredient_count` | số dòng `ct_nguyen_lieu` của công thức |

Phần phụ thuộc DB10–DB12, **chưa có SQL trong repo nên chưa điền**:

| JSON | Nguồn | Trạng thái |
|---|---|---|
| `tags[]`, tập mã tag hoàn cảnh, lọc `the` | Bảng tag và bảng nối món–tag (theo ghi chú Jira của TV3) | `TODO(DB10)` |
| `region`, lọc `vung_mien` | Cột vùng miền của món (theo ghi chú Jira: `mon_an.vung_mien`) | `TODO(DB10)` |
| `flavor`, lọc `flavor` | Chưa rõ: cột của món hay tag | `TODO(DB10)` |
| `cook_time_minutes` (món), lọc `max_cook_time` | Chưa rõ: cột của món hay suy ra từ công thức | `TODO(DB10)` |
| `is_basic_pantry` | Cờ gia vị cơ bản của nguyên liệu (theo ghi chú Jira: `nguyen_lieu.la_gia_vi_co_ban`) | `TODO(DB10)` |
| Tìm không dấu, từ đồng nghĩa (`search`) | Cột tên không dấu, bảng đồng nghĩa, hoặc `unaccent` | `TODO(DB11)` |
| `servings` | Chưa có cột khẩu phần trong schema 11/11/2026 | `TODO(DB)`, xem Q1 |
| `match_ratio`, `have_count`, `total_count`, `missing`, `readiness`, `is_incomplete`, `suggest-next` | RPC đối sánh và RPC gợi ý nguyên liệu | `TODO(DB12)` |

---

### 7.10. Câu hỏi còn mở

**Cho TV3 (Database):**
- **Q1.** `servings`: schema 11/11/2026 không có cột khẩu phần ở `cong_thuc`, trong khi FE10 cần hiển thị khẩu phần. Thêm cột (và nạp dữ liệu), hay bỏ `servings` khỏi contract?
- **Q2.** Tên và tham số RPC đối sánh và RPC `suggest-next`; công thức `match_ratio` và trọng số chính/phụ; ngưỡng `readiness`; `is_incomplete` lấy từ đâu. Nếu khác quy tắc ở 7.3 thì sửa contract theo RPC.
- **Q3.** Món có nhiều công thức: RPC đối sánh lấy công thức khớp nhất cho mỗi món, hay trả theo từng công thức? Và công thức nào được coi là **công khai** cho `GET /api/dishes/:id/recipes`, `GET /api/recipes/:id`: công thức hệ thống, hay cả công thức sinh ra từ bài đăng (khi đó cần theo trạng thái bài `PUBLIC`, tránh lộ bài `HIDDEN`/`DELETED`, QĐ 3.3)?
- **Q4.** Món có `match_ratio` thấp nhất bao nhiêu thì vẫn được trả (có cần ngưỡng, tính cả nguyên liệu tủ bếp cơ bản không)? Khi `pantry=true` mà người dùng chỉ chọn một nguyên liệu, mọi món có muối đều khớp ≥ 1.
- **Q5.** Nguồn dữ liệu của `flavor`, `cook_time_minutes`, `region`, `is_basic_pantry` (xem 7.9) và tập mã tag cuối cùng.

**Cho TV2 (Frontend, gồm Hương cho FE07–FE09 và người làm FE10):**
- **Q6.** Contract dùng key tiếng Anh; `adapters.js` nhận được cả hai nên không cần sửa. Xin xác nhận đồng ý chọn tiếng Anh.
- **Q7.** `mapSuggestionDish` không đọc `region` (bỏ qua, không lỗi). `mapDish`, `mapRecipeSummary`, `mapRecipeDetail` chưa đọc `cook_time_minutes`, `flavor`, `tags`, `region`, `servings` và `recipes[]` trong chi tiết món. FE10 cần bổ sung mapper khi nối API.
- **Q8.** `GET /api/dishes` giữ response như v1.0 (không có `cook_time_minutes`, `flavor`). Thẻ kết quả `/search` có cần thêm hai trường này không?
- **Q9.** `flavor` ở `/api/dishes` hiện chỉ nhận **một** mã. FE10 có cần chọn nhiều khẩu vị cùng lúc không?
- **Q10.** Có hai cờ mock: `VITE_USE_MOCK_API` (lớp `src/api/*` của FE07–FE09, mặc định bật nếu khác `'false'`) và `VITE_USE_MOCK` (lớp `src/lib/api`, chỉ trong chế độ dev và `'true'`). Khi tích hợp (INT02) cần đặt đúng cả hai.

**Cho TV4 (BE09, BE10):**
- **Q11.** `GET /api/dishes/match` bắt buộc đăng ký trước route `/:id` (xem 7.0).
- **Q12.** `ingredients` ở `GET /api/dishes` (v1.0: món chứa **tất cả** ID, tối đa 20) và ở `/api/dishes/match` (đối sánh, tối đa 30) khác ngữ nghĩa và khác giới hạn; xác nhận vẫn giữ riêng.
- **Q13.** Khi mọi ID ở `ingredients` đều không tồn tại: contract đang quy định `400` (QĐ 4.1); xin xác nhận.

### 7.11. Đối chiếu với frontend (22/11/2026)

Đối chiếu với `frontend/src/api/adapters.js` (nhánh `huong/feat/FE07-FE09-suggest-tabs`, `c302662`), các client `suggestionsApi.js`, `ingredientsApi.js`, `dishMatchApi.js`, và `frontend/docs/api-assumptions.md`.

- **Khớp, không cần sửa frontend:** tên query (`exclude`, `the`, `random`, `limit`, `vung_mien`, `search`, `ingredients`, `pantry`); key tiếng Anh của `mapSuggestionDish`, `mapIngredientItem`, `mapMatchDish`; `missing[].role`; `readiness` ba giá trị; `GET /api/dishes/:id/recipes` và `GET /api/recipes/:id` theo `api-assumptions.md` (mục 4).
- **Lệch hoặc chưa đọc:** Q1, Q7, Q8 ở trên. Ngoài ra `mapMatchDish` đưa mọi `readiness` lạ về `NEED_SHOPPING` và `role` lạ về `SECONDARY`; contract chỉ cho phép đúng các giá trị đã liệt kê nên trường hợp này không xảy ra nếu backend đúng.
- **Contract mở rộng so với `api-assumptions.md`:** `GET /api/dishes/:id` có thêm `cook_time_minutes`, `flavor`, `tags`, `region`, `recipes[]`; `RecipeSummary` có thêm `servings`; `GET /api/recipes/:id` có thêm `servings`. Tất cả là bổ sung, không đổi tên hay bỏ trường mà frontend đang dùng.

### 7.12. Xác nhận contract v2.0

Contract chỉ chốt khi các thành viên sau xác nhận dùng được và các câu hỏi Q1–Q13 đã có câu trả lời.

| Vai trò | Người | Nội dung xác nhận | Họ tên / ngày |
|---|---|---|---|
| TV2 (Frontend) | | Khớp adapter/mapper; Q6–Q10 | |
| TV3 (Database) | | Khớp schema Supabase, DB10–DB12; Q1–Q5 | |
| TV4 (Backend BE09, BE10) | | Dùng được cho BE09, BE10; Q11–Q13 | |
