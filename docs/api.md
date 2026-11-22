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
| 22/11/2026 | 2.0 (nháp) | TV1 | PO chốt: `servings` nullable và hiện luôn `null`; quy tắc `cook_time_minutes` của món; công thức công khai (đề xuất, chờ TV3); BE12 `suggest-next` và FE11 dời Sprint 3. Bổ sung cột trả về của `search_ingredients`, `match_dishes` quan sát từ Supabase. |
| 22/11/2026 | 2.0 (nháp) | TV1 | Đối chiếu với migration DB10–DB12 trên nhánh `origin/db` (`23b78ef`): chốt trọng số 2:1 và ngưỡng `readiness`; quy tắc BE10 ánh xạ `COOK_NOW`/`INCOMPLETE`, luôn truyền `p_include_pantry`, lỗi `22023` → 400; BE12 trở lại P1 (làm từ `match_dishes`); mã tag API ↔ `tag.slug` kebab-case. |
| 22/11/2026 | 2.0 (nháp) | TV1 | PO duyệt: Q15 (mã tag API in hoa ↔ slug kebab-case, hai chiều), Q16 (chỉ gợi ý món `ACTIVE` có ảnh và mô tả), Q4 (BE10 chỉ trả món có công thức chứa ≥ 1 nguyên liệu người dùng chọn, tủ bếp không tính), Q17 (`incomplete = NOT du_thong_tin_huong_dan`), Q3 (backend kiểm tra bài đăng gắn kèm phải `PUBLIC`), `flavor = null` ở Sprint 2, BE12 có `pantry` và tối đa 10 phần tử. Backlog Sprint 3: tìm nguyên liệu theo từ ở giữa tên. |

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
> **Nguồn schema (ưu tiên từ trên xuống):** migration DB10–DB12 trong `supabase/migrations/` trên nhánh `origin/db` (commit `23b78ef`, TV3), rồi `docs/schema-notes.md` và SQL khác trong `supabase/`, rồi [snapshot đọc từ Supabase ngày 22/11/2026](schema-snapshot-2026-11-22.md) (không phải migration; đối chiếu với migration ở mục 6 của snapshot).
> Chỗ ghi `TODO` là phần các nguồn trên chưa trả lời được; không suy đoán tên bảng, cột, RPC.
> Quy tắc xếp mức sẵn sàng đã đối chiếu với SQL của RPC `match_dishes` và khớp (mục 7.3). Nếu migration đổi thì mục này sửa theo migration.

### 7.0. Quy ước chung Sprint 2

- **Mọi endpoint mục 7 đều công khai**, không cần đăng nhập. Header `Authorization` nếu có thì bị bỏ qua.
- Key JSON **tiếng Anh `snake_case`**. Envelope và format lỗi như mục 1.1 và 1.2 (`VALIDATION_ERROR` kèm `details`, `NOT_FOUND`, `INTERNAL_ERROR`).
- Chỉ trả món có `trang_thai = 'ACTIVE'`. Món `HIDDEN`/`DELETED` luôn như không tồn tại (404 khi truy cập theo ID).
- **Tham số dạng CSV** (`exclude`, `the`, `ingredients`): các phần tử cách nhau bằng dấu phẩy, không có khoảng trắng. Chuỗi rỗng (`exclude=`) coi như không gửi, **không** trả 400. Phần tử rỗng ở giữa (`1,,2`) trả 400.
- **Danh sách ID** trong CSV: số nguyên dương, loại trùng trước khi xử lý.
- **Mã (code):** chữ in hoa, số và `_` (ví dụ `TROI_MUA`, `MAN`, `BAC`). Mã không nằm trong tập cho phép trả 400.
- **Mã tag hoàn cảnh** (chip tab Gợi ý): `TROI_MUA`, `LUOI_NAU`, `CUOI_THANG`, `NAU_CHO_4`, `AN_NHE`. API **luôn dùng mã viết hoa**. Trong DB, `tag.slug` bắt buộc dạng chữ thường kebab-case (`CHECK slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`). **Đã chốt (PO 22/11/2026, Q15):** backend ánh xạ hai chiều, mã API = slug in hoa với `-` thành `_` (`troi-mua` ↔ `TROI_MUA`, `nau-cho-4` ↔ `NAU_CHO_4`), áp dụng cho cả `the` (vào) lẫn `tags[]` (ra). DA04 phải nạp slug theo đúng quy tắc này; bảng `tag` hiện còn rỗng.
- **Mã khẩu vị:** `MAN`, `CAY`, `NGOT`, `CHUA`, `THANH` (theo frontend). `mon_an` không có cột khẩu vị, chưa biết lưu ở đâu nên `flavor` hiện luôn `null` (xem 7.9).
- **Mã vùng miền:** DB (`mon_an.vung_mien`) lưu `BAC`, `TRUNG`, `NAM`, `KHAC`; `NULL` nghĩa là chưa phân loại. Bộ lọc `vung_mien` nhận cả bốn mã; frontend hiện chỉ có chip `BAC`/`TRUNG`/`NAM`.
- Endpoint trả danh sách **không phân trang** (`suggestions`, `ingredients`, `dishes/match`) dùng envelope `{ "data": [ ] }`, không có `meta`. `GET /api/dishes` và `GET /api/dishes/:id/recipes` giữ phân trang mục 1.3.
- **Thứ tự đăng ký route (backend):** `GET /api/dishes/match` phải đăng ký trước các route có `:id` cùng tiền tố, nếu không `match` bị hiểu là ID và trả 400.

**Quyết định của PO (22/11/2026):**

- `servings`: nullable, **hiện luôn `null`**; frontend hiện "chưa có thông tin" (AC S2-04.6). Thêm cột khẩu phần vào DB ở Sprint 3.
- `cook_time_minutes` của món = `thoi_gian_phut` của **công thức đại diện**: công thức `ACTIVE` mà `match_dishes` chọn; nếu không có thì `MIN(thoi_gian_phut)` của các công thức `ACTIVE`; món không có công thức (hoặc không công thức nào có thời gian) thì `null`. Với các endpoint không có đầu vào nguyên liệu (`suggestions`, `dishes`, `dishes/:id`) dùng quy tắc `MIN`.
- `flavor`: **`null` trong Sprint 2** (PO chốt): chưa có nguồn dữ liệu (xem 7.9). Bộ lọc `flavor` ở 7.4 chưa hoạt động trong Sprint 2.
- Gợi ý (Q16, PO chốt): chỉ gợi ý món `ACTIVE` có **ảnh và mô tả không rỗng**, giống `search_dishes`.
- Đối sánh (Q4, PO chốt): BE10 chỉ trả món có công thức chứa **ít nhất một nguyên liệu người dùng chọn** (nguyên liệu tủ bếp cơ bản không tính); `match_percent` `null` thì `match_ratio = 0`.
- Công thức: `incomplete = NOT du_thong_tin_huong_dan` (Q17, PO chốt).
- BE12: duyệt tham số `pantry` (mặc định `true`) và tối đa 10 phần tử.
- **Backlog Sprint 3:** `search_ingredients` tìm theo từ ở giữa tên (gõ `chua` ra `Cà chua`); hiện chỉ tìm theo tiền tố.
- Công thức công khai (**PO chốt, Q3; ghi cho BE09**): `cong_thuc.trang_thai = 'ACTIVE'` **và** mọi bài đăng gắn với công thức (`bai_dang.ma_ct`) đều có `trang_thai = 'PUBLIC'` (bài `DRAFT`/`HIDDEN`/`DELETED` làm công thức không công khai). RLS của DB chỉ kiểm tra `ACTIVE`, nên **backend tự kiểm tra** điều kiện bài đăng. Công thức không có bài đăng nào gắn kèm thì chỉ cần `ACTIVE`. Áp dụng cho `GET /api/dishes/:id` (`recipes[]`), `GET /api/dishes/:id/recipes`, `GET /api/recipes/:id`.
- BE12 `GET /api/ingredients/suggest-next`: **không dời Sprint 3 nữa, vẫn P1**; làm từ một lần gọi `match_dishes` (7.8). FE11 vẫn P1, tùy TV5.

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
- Chỉ gợi ý món có **ảnh và mô tả không rỗng** (`hinh_anh` và `mo_ta_ngan` có ít nhất một ký tự không phải khoảng trắng), giống `search_dishes` (PO chốt, Q16). Điều kiện này áp dụng trước khi lọc `the`, `exclude`, `vung_mien`.
- `random=true`: chọn ngẫu nhiên trong tập món thỏa điều kiện (vẫn áp dụng `the`, `vung_mien`, `exclude`). Ngược lại sắp xếp ổn định theo `id` tăng dần.
- Mỗi lần gọi trả tối đa `limit` món khác nhau.

#### Query

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `exclude` | Không | CSV ID món đã xuất hiện trong phiên. Tối đa 200 ID. |
| `the` | Không | CSV mã tag hoàn cảnh. Tối đa 5 mã. Mã lạ → 400. |
| `random` | Không | `true` hoặc `false`. Mặc định `false`. Giá trị khác → 400. |
| `limit` | Không | Số nguyên 1–10. Mặc định `1`. Ngoài khoảng → 400. |
| `vung_mien` | Không | (P1) `BAC`, `TRUNG`, `NAM` hoặc `KHAC`. Mã lạ → 400. Kết hợp AND với `the`. Món chưa phân loại (`NULL`) không khớp giá trị nào. |

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
| `cook_time_minutes` | integer \| null | Quy tắc `MIN` thời gian các công thức `ACTIVE` của món (xem quyết định PO ở 7.0); `null` nếu không có. |
| `flavor` | string \| null | Một mã khẩu vị. **Hiện luôn `null`** (chưa chốt nguồn, xem 7.9). |
| `tags` | string[] | Mã tag của món (qua `mon_an_tag`), đổi từ `tag.slug` sang mã API theo quy tắc ở 7.0 (`troi-mua` → `TROI_MUA`); mảng rỗng nếu không có. |
| `region` | string \| null | `BAC`/`TRUNG`/`NAM`/`KHAC`; `null` = chưa phân loại. Nguồn `mon_an.vung_mien`. |

Hết món thỏa điều kiện: **`200` + `"data": []`**.

Lỗi: `400` (tham số sai), `500`.

---

### 7.2. `GET /api/ingredients` — Tìm nguyên liệu (autocomplete)

- Tìm **không phân biệt hoa thường, không phân biệt dấu** (`ca chua` → `Cà chua`) và **qua từ đồng nghĩa** (`hành xanh` → `Hành lá`). Dùng RPC `search_ingredients(p_search, p_limit)` của DB11 (migration `202611210002_ingredient_dictionary.sql`): so khớp **tiền tố** (prefix) trên tên đã chuẩn hóa không dấu của tên chuẩn và các từ đồng nghĩa (`nguyen_lieu_dong_nghia`), không tự bỏ dấu trong Node. Vì là tiền tố, `chua` không tìm ra `Cà chua`. RPC chỉ trả `ma_nl` và `ten_nl` (quan sát 22/11/2026), **không** có cờ gia vị: backend lấy `is_basic_pantry` bằng truy vấn thứ hai `nguyen_lieu.la_gia_vi_co_ban` theo các `ma_nl` trả về. RPC không từ chối chuỗi rỗng (trả nguyên liệu bất kỳ), nên backend tự kiểm tra `search` không rỗng trước khi gọi.
- Kết quả trả về là nguyên liệu **chuẩn** (id và tên chuẩn), không lặp nguyên liệu khi khớp nhiều cách.
- Chỉ trả nguyên liệu có trong từ điển hệ thống.
- Cột trả về của RPC: `ma_nl`, `ten_nl` (đã xác nhận bằng SQL); thứ tự RPC giữ nguyên.

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
| `is_basic_pantry` | boolean | `true` nếu thuộc tủ bếp cơ bản (muối, đường, dầu ăn, nước mắm, tiêu). Nguồn: `nguyen_lieu.la_gia_vi_co_ban`. |

Không thấy: **`200` + `"data": []`**. Thứ tự do RPC quyết định: khớp chính xác tên chuẩn đứng trước, sau đó theo `ten_nl`, rồi `ma_nl`. RPC giới hạn `p_limit` trong 1–100 và nhận chuỗi rỗng như "tìm tất cả", nên backend tự chặn `search` rỗng (mục 7.2 ở trên).

Lỗi: `400`, `500`.

---

### 7.3. `GET /api/dishes/match` — Đối sánh nguyên liệu (tab Theo nguyên liệu)

- Cần **ít nhất 1 nguyên liệu hợp lệ** (QĐ 4.1).
- Gọi RPC `match_dishes(p_ingredient_ids, p_include_pantry, p_limit, p_offset)` (migration `202611220001_dish_matching.sql`), **không** viết logic đối sánh trong Node. Quy tắc của RPC (đã xác nhận bằng SQL):
  - Mỗi món `ACTIVE` lấy **một** công thức `ACTIVE`: ưu tiên công thức đủ dữ liệu, rồi % khớp cao nhất, rồi ít thiếu nhất, rồi `ma_ct` nhỏ nhất.
  - **Trọng số `PRIMARY:SECONDARY = 2:1`.** `match_percent = round(100 × matched_weight / total_weight, 2)`.
  - Tủ bếp cơ bản (`nguyen_lieu.la_gia_vi_co_ban`) chỉ được tính là có khi `p_include_pantry = true`.
  - Món có nguyên liệu nằm trong hạn chế của người dùng (`han_che_nguyen_lieu`, theo `auth.uid()`) bị loại; khách không bị loại món nào.
  - RPC trả **mọi món `ACTIVE`**, kể cả món khớp 0% và món chưa có công thức `ACTIVE`. Thứ tự: món đủ dữ liệu trước món chưa đầy đủ, rồi `match_percent` giảm dần, rồi ít thiếu hơn, rồi `ma_mon`. Sắp xếp do API quyết định; frontend giữ nguyên thứ tự.
- Frontend chia 4 nhóm; API chỉ trả `readiness` (3 giá trị) và `is_incomplete`. Món `is_incomplete = true` được frontend xếp vào nhóm "Chưa đủ dữ liệu để kết luận" bất kể `readiness`.

#### Quy tắc cho BE10 (PO chốt 22/11/2026)

1. **Luôn truyền `p_include_pantry`** (giá trị `pantry` của request, mặc định contract là `true`). RPC tự mặc định `false`, nên không được bỏ trống.
2. **Truyền `p_limit = 500`, `p_offset = 0`** để lấy hết món (RPC mặc định 100, tối đa 500).
3. **Ánh xạ `readiness`:** RPC trả `COOK_NOW` → contract `READY`. RPC trả `MISSING_1_2` và `NEED_SHOPPING` → giữ nguyên. RPC trả `INCOMPLETE` → tính theo `missing_count` (0 → `READY`, 1–2 → `MISSING_1_2`, còn lại → `NEED_SHOPPING`) và đặt `is_incomplete = true`.
4. **Lỗi `22023` của RPC → `400 VALIDATION_ERROR`** (ID nguyên liệu không tồn tại hoặc null). Mã lỗi khác → `500`, không lộ chi tiết.
5. `have_count`, `total_count`: BE10 tự tính (`total_count` = số dòng `ct_nguyen_lieu` của `ma_ct`; `have_count = total_count − missing_count`). `match_ratio = match_percent / 100`; khi `match_percent` là `null` (món không có công thức `ACTIVE` hoặc công thức không có nguyên liệu, tức `total_weight = 0`) thì `match_ratio = 0` (PO chốt).
6. **Lọc món (Q4, PO chốt):** chỉ giữ món mà công thức do RPC chọn (`ma_ct`) chứa **ít nhất một nguyên liệu người dùng đã chọn** (`ingredients` của request). Nguyên liệu tủ bếp cơ bản tự được coi là có **không tính** vào điều kiện này (nhưng nếu người dùng tự chọn một nguyên liệu tủ bếp thì nó là nguyên liệu người dùng chọn). Món không có công thức (`ma_ct` rỗng) bị loại. Thứ tự các món còn lại giữ nguyên như RPC. Cách làm gợi ý: một truy vấn thêm vào `ct_nguyen_lieu` theo các `ma_ct` và các `ma_nl` của request.
7. RPC gọi bằng quyền nào: xem Q14 (hiện `service_role` bị từ chối).

#### Query

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `ingredients` | **Có** | CSV ID nguyên liệu, 1–30 ID (RPC cho tới 1000). Thiếu hoặc rỗng → 400. **ID không tồn tại (dù chỉ một) → 400** (RPC từ chối, `22023`). |
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

| Trường | Kiểu | Nguồn (cột RPC) |
|---|---|---|
| `id` | integer | `ma_mon` |
| `name` | string | `ten_mon` |
| `image_url` | string \| null | RPC không trả ảnh: lấy thêm từ `mon_an.hinh_anh` |
| `match_ratio` | number 0–1 | `match_percent / 100` (trọng số 2:1, QĐ 4.2); `null` → 0 (PO chốt) |
| `have_count` | integer | Tính như quy tắc 5 (tính cả tủ bếp cơ bản khi `pantry=true`) |
| `total_count` | integer | Tính như quy tắc 5 |
| `missing` | array | `missing_ingredients[]`: `ma_nl` → `id`, `ten_nl` → `name`, `role` giữ nguyên (`PRIMARY` \| `SECONDARY`). Mảng rỗng nếu không thiếu gì |
| `readiness` | string | `READY` \| `MISSING_1_2` \| `NEED_SHOPPING`, ánh xạ theo quy tắc 3 |
| `is_incomplete` | boolean | `is_incomplete` của RPC |

Luôn có `have_count + missing.length = total_count`.

**Ngưỡng `readiness` của RPC** (đã chốt): số nguyên liệu còn thiếu (`missing_count`, tính theo số dòng, không phân biệt chính/phụ) bằng 0 → `COOK_NOW` (`READY`); từ 1 đến 2 → `MISSING_1_2`; còn lại → `NEED_SHOPPING`. Món chưa đầy đủ luôn là `INCOMPLETE` ở RPC (không bao giờ khẳng định sẵn sàng).

**`is_incomplete = true` khi** (theo SQL): món không có công thức `ACTIVE`; `trang_thai_thanh_phan` khác `COMPLETE`; công thức không có nguyên liệu; thiếu `thoi_gian_phut`; không có bước nào; hoặc có nguyên liệu không có (định lượng dương và đơn vị) và cũng không có ghi chú khi `so_luong` rỗng.

Hệ số khớp `match_ratio` và con số `have_count/total_count` có thể không tương ứng nhau (ví dụ 5/7 nhưng 0.78); đó là thiết kế.

Không có món nào: **`200` + `"data": []`** (sau khi lọc theo quy tắc 6).

Lỗi: `400`, `500`.

---

### 7.4. `GET /api/dishes` — Tìm và lọc món (mở rộng mục 2.5)

Giữ nguyên `search`, `ingredients`, `page`, `limit` và response như mục 2.5. Thêm các thay đổi sau (BE09):

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `search` | Không | **Nâng cấp:** không phân biệt hoa thường **và không phân biệt dấu** (`pho bo` tìm được `Phở bò`). SQL `supabase/search_public_dishes.sql` (RPC `search_public_dishes`) đã so khớp bằng `unaccent(lower(...))`; BE09 dùng lại hoặc mở rộng RPC để thêm bộ lọc `the`/`flavor`/`max_cook_time`. |
| `the` | Không | CSV mã tag (mã API, ánh xạ sang `tag.slug` theo 7.0), điều kiện AND. Mã lạ → 400. |
| `flavor` | Không | Một mã khẩu vị (`MAN`, `CAY`, `NGOT`, `CHUA`, `THANH`). Mã lạ → 400. |
| `max_cook_time` | Không | Số nguyên 1–1440 (phút). Chỉ trả món có ít nhất một công thức `ACTIVE` với `thoi_gian_phut ≤` giá trị này (tương đương `MIN ≤` giá trị, và cùng nghĩa với `max_minutes` của RPC `search_dishes`); món chưa có thời gian bị loại khi dùng bộ lọc này. |

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
        "servings": null,
        "prep_time_minutes": 40,
        "ingredient_count": 9,
        "incomplete": false
      }
    ]
  }
}
```

- `recipes` dùng **cùng cấu trúc `RecipeSummary`** với mục 7.6. Món chưa có công thức: `"recipes": []`, vẫn là `200`.
- Chỉ liệt kê công thức công khai theo quy tắc ở 7.0 (Q3, backend tự kiểm tra bài đăng gắn kèm), sắp xếp theo `id` tăng dần.

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
| `servings` | integer \| null | Khẩu phần. **Hiện luôn `null`** (PO chốt 22/11/2026; DB chưa có cột, thêm ở Sprint 3). Frontend hiện "chưa có thông tin". |
| `prep_time_minutes` | integer \| null | `null` = chưa có thông tin. |
| `ingredient_count` | integer | |
| `incomplete` | boolean | `NOT du_thong_tin_huong_dan` (PO chốt, Q17): công thức chưa đầy đủ khi **không** thỏa đồng thời: `trang_thai_thanh_phan = 'COMPLETE'`, có `thoi_gian_phut`, có ít nhất một bước (QĐ 1.5, QĐ 4.4). |

```json
{
  "data": [
    { "id": 31, "dish_id": 12, "name": "Canh chua cá lóc miền Tây", "servings": null, "prep_time_minutes": 40, "ingredient_count": 9, "incomplete": false }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

Lỗi: `400`, `404`, `500`.

---

### 7.7. `GET /api/recipes/:id` — Chi tiết công thức

- `:id` là số nguyên dương. Công thức không tồn tại, không công khai (quy tắc ở 7.0, Q3), hoặc thuộc món không `ACTIVE` → `404`.

#### Response `200`
```json
{
  "data": {
    "id": 31,
    "dish_id": 12,
    "name": "Canh chua cá lóc miền Tây",
    "servings": null,
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

> **P1, không còn dời Sprint 3** (PO chốt 22/11/2026). Migration `origin/db` không có RPC riêng cho việc này, nên làm từ kết quả của `match_dishes`.

**Cách làm:** gọi `match_dishes` **một lần** (cùng quy tắc gọi và xử lý lỗi như 7.3, kể cả luôn truyền `p_include_pantry`), rồi trong backend chỉ gom nhóm kết quả, không viết lại công thức đối sánh:
1. Giữ các món có `missing_count = 1` **và** `is_incomplete = false`, trên danh sách đã lọc theo quy tắc 6 của 7.3 (Q4).
2. Mỗi món có đúng một nguyên liệu thiếu (phần tử duy nhất trong `missing_ingredients`).
3. Nhóm theo nguyên liệu thiếu: `unlock_count` = số món, `dish_ids` = ID các món (tăng dần).
4. Sắp xếp theo `unlock_count` giảm dần, rồi `ingredient.id` tăng dần.

| Tham số | Bắt buộc | Quy tắc |
|---|---|---|
| `ingredients` | **Có** | CSV ID nguyên liệu đang có, 1–30 ID. Thiếu, rỗng hoặc ID không tồn tại (`22023`) → 400. |
| `pantry` | Không | Như 7.3, mặc định `true`, để khớp công tắc tủ bếp ở tab Theo nguyên liệu (PO duyệt). |

#### Response `200`
```json
{
  "data": [
    { "ingredient": { "id": 3, "name": "Hành lá" }, "unlock_count": 4, "dish_ids": [7, 12, 15, 21] }
  ]
}
```

Trả tối đa 10 phần tử (PO duyệt). Không có gợi ý: `200` + `"data": []`.

Lỗi: `400`, `500`.

---

### 7.9. Ánh xạ JSON ↔ Database (Sprint 2)

Nguồn: migration DB10–DB12 trên `origin/db` (`23b78ef`), `docs/schema-notes.md` và SQL trong `supabase/`; snapshot Supabase 22/11/2026 chỉ dùng khi migration không nói ([schema-snapshot-2026-11-22.md](schema-snapshot-2026-11-22.md)).

**Đã xác nhận bằng migration:**

| JSON | Bảng.cột DB |
|---|---|
| `id`, `name`, `description` / `short_description`, `image_url` (món) | `mon_an.ma_mon`, `ten_mon`, `mo_ta_ngan`, `hinh_anh`; lọc `mon_an.trang_thai = 'ACTIVE'` |
| `region`, lọc `vung_mien` | `mon_an.vung_mien`, `CHECK IN ('BAC','TRUNG','NAM','KHAC')`, `NULL` = chưa phân loại |
| `tags[]`, lọc `the` | `tag.slug` (kebab-case chữ thường, `UNIQUE`) qua `mon_an_tag(ma_mon, ma_tag)`; mã API ↔ slug theo 7.0. Khách chỉ thấy tag của món `ACTIVE` (RLS) |
| `is_basic_pantry` | `nguyen_lieu.la_gia_vi_co_ban` (boolean, mặc định `false`) |
| Tìm nguyên liệu | RPC `search_ingredients`; tên chuẩn hóa không dấu: `nguyen_lieu.ten_khong_dau` (cột sinh từ `normalize_ingredient_name`); đồng nghĩa: `nguyen_lieu_dong_nghia(ten_goi, ten_khong_dau, ma_nl)` |
| `recipes[].id`, `dish_id`, `name` | `cong_thuc.ma_ct`, `ma_mon`, `ten_ct` |
| `prep_time_minutes` | `cong_thuc.thoi_gian_phut` |
| Công thức đang hiển thị | `cong_thuc.trang_thai = 'ACTIVE'` (`CHECK IN ('ACTIVE','HIDDEN','DELETED')`); RLS cho phép đọc công thức `ACTIVE` |
| `ingredients[]` (công thức) | `ct_nguyen_lieu` (`so_luong`, `don_vi`, `vai_tro_nl` ∈ `PRIMARY`/`SECONDARY`) + `nguyen_lieu` (`ma_nl`, `ten_nl`) |
| `steps[]` | `buoc_cong_thuc` (`stt` → `order`, `noi_dung` → `content`) |
| `ingredient_count` | số dòng `ct_nguyen_lieu` của công thức |
| `match_ratio`, `missing`, `readiness`, `is_incomplete` | RPC `match_dishes`, ánh xạ ở 7.3: trọng số 2:1, ngưỡng 0 / ≤2 / còn lại, `COOK_NOW` → `READY` |
| `cook_time_minutes` (món), lọc `max_cook_time` | PO chốt: `MIN(cong_thuc.thoi_gian_phut)` của công thức `ACTIVE`, `null` nếu không có; lọc cùng nghĩa với `search_dishes(max_minutes)` |
| `suggest-next` | Không có RPC riêng; gom nhóm từ `match_dishes` (7.8) |

**Chưa chốt hoặc có lệch:**

| Nội dung | Tình trạng |
|---|---|
| Slug thật của chip hoàn cảnh | Bảng `tag` và `mon_an_tag` **đang rỗng** (đọc 22/11/2026); fixture test của TV3 dùng `bua-sang`, `an-nhanh`. Lọc `the` không trả món nào cho đến khi DA04 nạp tag đúng quy tắc mã ↔ slug (đã chốt, Q15) |
| `flavor`, lọc `flavor` | `mon_an` không có cột khẩu vị. Ứng viên chưa xác nhận: `thuoc_tinh_mon` (`nhom_tt`, `gia_tri`) qua `mon_an_thuoc_tinh`. **`flavor = null` trong Sprint 2** (PO chốt); nguồn dữ liệu xử lý ở Sprint 3 |
| `servings` | Không có cột khẩu phần. PO chốt: luôn `null` ở Sprint 2, thêm cột ở Sprint 3 |
| `incomplete` của công thức (7.5–7.7) | **Đã chốt (PO, Q17):** `NOT du_thong_tin_huong_dan`, với `du_thong_tin_huong_dan` = `trang_thai_thanh_phan = 'COMPLETE'` và có `thoi_gian_phut` và có ít nhất một bước (định nghĩa của view `thong_tin_cong_thuc`). View chỉ cấp `SELECT` cho `anon`, `authenticated`, **không** cho `service_role`, nên backend tính cùng điều kiện trên bảng `cong_thuc` và `buoc_cong_thuc` |
| Công thức công khai (7.5–7.7) | **Đã chốt (PO, Q3):** `cong_thuc.trang_thai = 'ACTIVE'` và mọi bài đăng gắn kèm (`bai_dang.ma_ct`) phải `PUBLIC`; DB chỉ kiểm tra `ACTIVE` (RLS) nên backend (BE09) tự kiểm tra bài đăng. Migration chưa thấy ràng buộc mỗi công thức chỉ có một bài đăng |
| Quyền gọi `match_dishes` bằng `service_role` | Thiếu `GRANT SELECT ON public.han_che_nguyen_lieu TO service_role` (Q14, còn mở) |

---

### 7.10. Câu hỏi còn mở

**Cho TV3 (Database):**
- **Q1.** `servings`: **đã chốt (PO 22/11/2026)**: nullable, luôn `null` ở Sprint 2; thêm cột ở Sprint 3. Frontend hiện "chưa có thông tin".
- **Q2.** **Đã chốt** bằng migration `202611220001_dish_matching.sql`: trọng số `PRIMARY:SECONDARY = 2:1`; ngưỡng `readiness` (thiếu 0 / ≤ 2 / còn lại); nguồn `is_incomplete`; cột trả về của `match_dishes` và `search_ingredients`. `have_count`/`total_count`: BE10 tự tính (PO). Hai điều còn nhắc: RPC không có tham số `limit` mặc định phù hợp (mặc định 100, BE10 truyền 500) và `match_percent` có thể `null` (xem 7.3).
- **Q3.** **Đã chốt (PO 22/11/2026):** công thức công khai = `cong_thuc.trang_thai = 'ACTIVE'` và mọi bài đăng gắn kèm phải `PUBLIC`; backend tự kiểm tra vì RLS chỉ kiểm tra `ACTIVE`. Ghi cho BE09 (7.0). TV3 vẫn có thể xác nhận ở buổi họp, đặc biệt trường hợp một công thức có nhiều bài đăng.
- **Q4.** **Đã chốt (PO 22/11/2026):** BE10 chỉ trả món có công thức (do RPC chọn) chứa ít nhất một nguyên liệu người dùng chọn; tủ bếp cơ bản không tính; `match_percent` `null` thì `match_ratio = 0` (7.3, quy tắc 5–6).
- **Q5.** Đã biết: `region` ← `mon_an.vung_mien`; `is_basic_pantry` ← `nguyen_lieu.la_gia_vi_co_ban`; tag ← `tag.slug` (qua quy tắc ánh xạ); `cook_time_minutes` theo quy tắc PO; `flavor = null` ở Sprint 2. **Còn mở:** dữ liệu `tag`/`mon_an_tag` (đang rỗng, chờ DA04) và đồng ý để `GET /api/suggestions` truy vấn bảng `mon_an`/`mon_an_tag`/`tag` thay vì RPC (RPC `search_dishes` không lọc theo tag và không có vùng miền).
- **Q14.** **Còn mở.** `match_dishes` được `GRANT EXECUTE` cho `service_role` nhưng `service_role` chưa có `SELECT` trên `han_che_nguyen_lieu` (RPC `SECURITY INVOKER` có join bảng này), nên gọi bằng `service_role` trả `42501`; gọi bằng `anon` thì chạy. Cần `GRANT SELECT ON public.han_che_nguyen_lieu TO service_role;` hoặc backend dùng client `anon` cho RPC này. Cần quyết định trước khi làm BE10.
- **Q15.** **Đã chốt (PO 22/11/2026):** API dùng mã in hoa; backend ánh xạ ↔ `tag.slug` kebab-case (`troi-mua` ↔ `TROI_MUA`) cả chiều vào (`the`) và ra (`tags[]`). Cần DA04 nạp slug theo quy tắc này.
- **Q16.** **Đã chốt (PO 22/11/2026):** `GET /api/suggestions` chỉ gợi ý món `ACTIVE` có ảnh và mô tả không rỗng, giống `search_dishes`.
- **Q17.** **Đã chốt (PO 22/11/2026):** `incomplete = NOT du_thong_tin_huong_dan` cho công thức ở 7.5–7.7.

**Cho TV2 (Frontend, gồm Hương cho FE07–FE09 và người làm FE10):**
- **Q6.** Contract dùng key tiếng Anh; `adapters.js` nhận được cả hai nên không cần sửa. Xin xác nhận đồng ý chọn tiếng Anh.
- **Q7.** `mapSuggestionDish` không đọc `region` (bỏ qua, không lỗi). `mapDish`, `mapRecipeSummary`, `mapRecipeDetail` chưa đọc `cook_time_minutes`, `flavor`, `tags`, `region`, `servings` và `recipes[]` trong chi tiết món. FE10 cần bổ sung mapper khi nối API.
- **Q8.** `GET /api/dishes` giữ response như v1.0 (không có `cook_time_minutes`, `flavor`). Thẻ kết quả `/search` có cần thêm hai trường này không?
- **Q9.** `flavor` ở `/api/dishes` hiện chỉ nhận **một** mã. FE10 có cần chọn nhiều khẩu vị cùng lúc không?
- **Q10.** Có hai cờ mock: `VITE_USE_MOCK_API` (lớp `src/api/*` của FE07–FE09, mặc định bật nếu khác `'false'`) và `VITE_USE_MOCK` (lớp `src/lib/api`, chỉ trong chế độ dev và `'true'`). Khi tích hợp (INT02) cần đặt đúng cả hai.

**Cho TV4 (BE09, BE10):**
- **Q11.** `GET /api/dishes/match` bắt buộc đăng ký trước route `/:id` (xem 7.0).
- **Q12.** `ingredients` ở `GET /api/dishes` (v1.0: món chứa **tất cả** ID, tối đa 20) và ở `/api/dishes/match` (đối sánh, tối đa 30) khác ngữ nghĩa và khác giới hạn; xác nhận vẫn giữ riêng.
- **Q13.** **Đã chốt:** RPC từ chối **mọi** ID không tồn tại bằng `22023`, nên contract quy định `400` khi có bất kỳ ID nào không tồn tại (QĐ 4.1).

### 7.11. Đối chiếu với frontend (22/11/2026)

Đối chiếu với `frontend/src/api/adapters.js` (nhánh `huong/feat/FE07-FE09-suggest-tabs`, `c302662`), các client `suggestionsApi.js`, `ingredientsApi.js`, `dishMatchApi.js`, và `frontend/docs/api-assumptions.md`.

- **Khớp, không cần sửa frontend:** tên query (`exclude`, `the`, `random`, `limit`, `vung_mien`, `search`, `ingredients`, `pantry`); key tiếng Anh của `mapSuggestionDish`, `mapIngredientItem`, `mapMatchDish`; `missing[].role`; `readiness` ba giá trị; `GET /api/dishes/:id/recipes` và `GET /api/recipes/:id` theo `api-assumptions.md` (mục 4).
- **Lệch hoặc chưa đọc:** Q1, Q7, Q8 ở trên. Ngoài ra `mapMatchDish` đưa mọi `readiness` lạ về `NEED_SHOPPING` và `role` lạ về `SECONDARY`; contract chỉ cho phép đúng các giá trị đã liệt kê nên trường hợp này không xảy ra nếu backend đúng.
- **Contract mở rộng so với `api-assumptions.md`:** `GET /api/dishes/:id` có thêm `cook_time_minutes`, `flavor`, `tags`, `region`, `recipes[]`; `RecipeSummary` có thêm `servings`; `GET /api/recipes/:id` có thêm `servings`. Tất cả là bổ sung, không đổi tên hay bỏ trường mà frontend đang dùng.

### 7.12. Xác nhận contract v2.0

Contract chỉ chốt khi các thành viên sau xác nhận dùng được và các câu hỏi Q1–Q17 đã có câu trả lời (Q5 và Q14 còn mở).

| Vai trò | Người | Nội dung xác nhận | Họ tên / ngày |
|---|---|---|---|
| TV2 (Frontend) | | Khớp adapter/mapper; Q6–Q10 | |
| TV3 (Database) | | Khớp schema Supabase, DB10–DB12; Q5, Q14 (Q1–Q4, Q15–Q17 đã chốt bởi PO) | |
| TV4 (Backend BE09, BE10) | | Dùng được cho BE09, BE10; Q11–Q13 | |
