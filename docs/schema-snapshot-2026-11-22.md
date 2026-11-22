# Snapshot schema Supabase — 22/11/2026

> **Đây là snapshot đọc trực tiếp từ Supabase, không phải migration.** Không dùng file này để tạo hay chạy lại schema. Nguồn sự thật để tạo schema vẫn là SQL của TV3 trong `supabase/` (hiện chưa có SQL của DB10–DB12).
> **Mục đích:** có căn cứ để điền ánh xạ DB ở mục 7.9 của `docs/api.md` (BE07, Sprint 2).

## 1. Cách lấy và giới hạn

- **Cách lấy:** `GET {SUPABASE_URL}/rest/v1/` với header `apikey` và `Authorization: Bearer` bằng `SUPABASE_SERVICE_ROLE_KEY` trong `backend/.env`, lấy OpenAPI (Swagger 2.0) do PostgREST 14.18 sinh ra từ schema `public`. Key không được ghi vào tài liệu, `.env` không được commit. File spec thô không được đưa vào repo.
- **Quy tắc 3 (cập nhật):** nguồn schema hợp lệ gồm SQL trong `supabase/` **hoặc** snapshot đọc trực tiếp từ Supabase như file này.
- **Snapshot cho biết:** tên bảng/view, tên cột, kiểu, cột nào bắt buộc (NOT NULL), giá trị mặc định, khóa chính/khóa ngoại, ghi chú (`COMMENT`) và tham số đầu vào của RPC.
- **Snapshot không cho biết:**
  - Kiểu và tên cột **trả về** của RPC (OpenAPI chỉ ghi `200 OK`).
  - Thân hàm, công thức tính, ngưỡng nhóm.
  - Ràng buộc `CHECK`/enum, khóa `UNIQUE` không phải khóa chính, chỉ mục, RLS, grant.
  - **Dữ liệu** trong bảng: mục 1–4 chỉ từ OpenAPI. Một phần dữ liệu và kết quả gọi RPC được đọc thêm ở **mục 5** (chỉ đọc, không ghi).
- Chỉ phản ánh các đối tượng mà vai trò dùng khi gọi nhìn thấy trong schema `public` tại thời điểm 22/11/2026.

## 2. Bảng và view liên quan Sprint 2

Kiểu theo OpenAPI: `int64` = bigint, `int32` = integer. "NN" = NOT NULL. Chỉ ghi cột có trong snapshot.

### 2.1. Món ăn, tag, thuộc tính

**`mon_an`** (PK `ma_mon`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `ma_mon` | int64 NN | PK |
| `ten_mon` | text NN | |
| `mo_ta_ngan` | text | |
| `hinh_anh` | text | |
| `trang_thai` | text NN, mặc định `ACTIVE` | |
| `vung_mien` | text | Comment: `BAC`/`TRUNG`/`NAM`/`KHAC`; `NULL` nghĩa là chưa phân loại, không phải mọi vùng |

Không có cột khẩu vị hay thời gian nấu ở cấp món.

**`tag`** (PK `ma_tag`). Comment: *Occasion chips; stable slug for DA04/BE08. Taxonomy curated separately.*

| Cột | Kiểu |
|---|---|
| `ma_tag` | int64 NN |
| `slug` | text NN |
| `ten_tag` | text NN |

**`mon_an_tag`** (PK `ma_mon` + `ma_tag`). Comment: *Many-to-many dish/occasion tags; unique pair; visible only for ACTIVE dishes to guests.* FK: `ma_mon` → `mon_an`, `ma_tag` → `tag`.

**`thuoc_tinh_mon`** (PK `ma_tt`): `ma_tt` int64 NN, `nhom_tt` text NN, `gia_tri` text NN.
**`mon_an_thuoc_tinh`** (PK `ma_mon` + `ma_tt`): FK → `mon_an`, `thuoc_tinh_mon`.
Snapshot không nói `nhom_tt` có những nhóm nào (ví dụ có chứa khẩu vị, loại món hay không).

### 2.2. Nguyên liệu và từ đồng nghĩa

**`nguyen_lieu`** (PK `ma_nl`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `ma_nl` | int64 NN | PK |
| `ten_nl` | text NN | |
| `la_gia_vi_co_ban` | boolean NN, mặc định `false` | Comment: cờ tủ bếp cơ bản do người quản trị gán; không có nghĩa là người dùng đang có, không ghi đè hạn chế dị ứng hay vai trò trong công thức |
| `ten_khong_dau` | text | Tên không dấu |

**`nguyen_lieu_dong_nghia`** (PK `ten_khong_dau`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `ten_goi` | text NN | Tên gọi đồng nghĩa |
| `ten_khong_dau` | text NN | PK |
| `ma_nl` | int64 NN | FK → `nguyen_lieu.ma_nl` |

**`han_che_nguyen_lieu`** (PK `ma_nd` + `ma_nl`; cột `loai_han_che` text NN). Liên quan dị ứng/kiêng kỵ (QĐ 4.3), **ngoài phạm vi Sprint 2**; chỉ liệt kê.

### 2.3. Công thức

**`cong_thuc`** (PK `ma_ct`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `ma_ct` | int64 NN | PK |
| `ma_mon` | int64 NN | FK → `mon_an` |
| `ma_nguoi_tao` | uuid | FK → `nguoi_dung` |
| `ten_ct` | text NN | |
| `thoi_gian_phut` | int32 | |
| `trang_thai_thanh_phan` | text NN, mặc định `INCOMPLETE` | |
| `tao_luc` | timestamptz NN, mặc định `now()` | |
| `trang_thai` | text NN, mặc định `ACTIVE` | |

Không có cột khẩu phần.

**`ct_nguyen_lieu`** (PK `ma_ct` + `ma_nl`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `so_luong` | numeric | |
| `don_vi` | text | |
| `vai_tro_nl` | text NN, mặc định `SECONDARY` | Comment: vai trò khi đối sánh, `PRIMARY` hoặc `SECONDARY`; độc lập với cờ tủ bếp cơ bản |
| `ghi_chu` | text | |

**`buoc_cong_thuc`** (PK `ma_ct` + `stt`): `noi_dung` text NN.

**`thong_tin_cong_thuc`** (view hoặc bảng không có `NN`; PK `ma_ct`): các cột của `cong_thuc` cùng `ma_ct`, `ma_mon`, `ma_nguoi_tao`, `ten_ct`, `thoi_gian_phut`, `trang_thai_thanh_phan`, `tao_luc`, `trang_thai` và thêm `du_thong_tin_huong_dan` boolean. Snapshot không nói cách tính cột này.

### 2.4. Bài đăng (chỉ phần liên quan quyền hiển thị công thức)

**`bai_dang`**: `ma_bai`, `ma_tac_gia`, `loai_bai`, `ma_ct` (FK → `cong_thuc`), `ma_quan`, `ma_mon_da_dung`, `tieu_de`, `noi_dung`, `gia_da_tra`, `trang_thai` (mặc định `DRAFT`), `tao_luc`, `sua_luc`.

## 3. RPC

OpenAPI không ghi cột trả về của RPC. Cột trả về của `search_ingredients` và `match_dishes` đã quan sát bằng cách gọi thử (mục 5.2); các RPC còn lại chưa biết.

### 3.1. Dùng cho Sprint 2

| RPC | Tham số (bắt buộc: có dấu *) | Mô tả trong snapshot |
|---|---|---|
| `match_dishes` | `p_ingredient_ids` bigint[] \*, `p_include_pantry` boolean, `p_limit` int, `p_offset` int | Comment: *One best ACTIVE recipe per ACTIVE dish; PRIMARY:SECONDARY=2:1; pantry opt-in; RLS and caller restrictions apply. INCOMPLETE never asserts readiness.* |
| `match_recipes` | `ingredient_ids` bigint[] \*, `primary_weight` numeric, `secondary_weight` numeric | Không có comment. Chưa rõ quan hệ với `match_dishes` |
| `search_ingredients` | `p_search` text, `p_limit` int | Không có comment |
| `normalize_ingredient_name` | `value` text \* | Không có comment |
| `resolve_ingredient` | `p_name` text \* | Không có comment |
| `search_dishes` | `query_text` text, `attribute_ids` bigint[], `max_minutes` int, `excluded_dish_ids` bigint[], `discovery` boolean | Không có comment. Tham số cho thấy lọc theo thuộc tính (bảng `thuoc_tinh_mon`), thời gian, loại trừ món, chế độ khám phá; **không có tham số tag hay vùng miền** |

### 3.2. Đã có từ Sprint 1 hoặc ngoài Sprint 2

`search_public_dishes(p_search, p_page, p_limit)`, `create_post_with_recipe`, `get_public_post(p_id)`, `get_public_posts(p_page, p_limit)`. Ngoài phạm vi: `moderate_content`, `resolve_report`, `set_account_state`, `nearby_restaurants`, `saved_dishes`.

### 3.3. Không thấy trong snapshot

- RPC cho `GET /api/ingredients/suggest-next` (BE12).
- RPC hay view dành riêng cho gợi ý theo tag (BE08).

## 4. Khác biệt so với `docs/schema-notes.md` (11/11/2026)

Có thêm: `mon_an.vung_mien`; `nguyen_lieu.la_gia_vi_co_ban`, `ten_khong_dau`; `cong_thuc.tao_luc`, `trang_thai`; các bảng `tag`, `mon_an_tag`, `nguyen_lieu_dong_nghia`, `thuoc_tinh_mon`, `mon_an_thuoc_tinh`; view `thong_tin_cong_thuc`; các RPC ở mục 3.1. Vẫn **không có** cột khẩu phần ở `cong_thuc`.

## 5. Kết quả đọc thêm (22/11/2026, chỉ đọc)

Chỉ dùng `GET` và gọi RPC đọc; không ghi gì vào Supabase. Đây là quan sát tại một thời điểm, không phải đặc tả.

### 5.1. Dữ liệu bảng

| Bảng | Kết quả |
|---|---|
| `tag` | **0 dòng.** Chưa có tag nào, nên chưa có `slug` hoàn cảnh nào để lọc |
| `mon_an_tag` | **0 dòng** |
| `thuoc_tinh_mon` | **Không đọc được:** `42501 permission denied for table thuoc_tinh_mon` với `service_role` (chưa `GRANT SELECT`). Không cấp quyền vì chỉ được phép đọc. Chưa xác định được nhóm thuộc tính, nên **chưa xác định được nguồn của `flavor`** |
| `nguyen_lieu` | **Đọc được bằng `service_role`** (`SELECT ma_nl, ten_nl, la_gia_vi_co_ban`). Mẫu đã đọc: `Dầu ăn` (`ma_nl` 5) và `Cà chua` (46) đều có `la_gia_vi_co_ban = false`, nên `Dầu ăn` chưa được coi là tủ bếp cơ bản trong dữ liệu |
| `cong_thuc` | 90 dòng. `trang_thai`: chỉ có `ACTIVE` (90/90). `trang_thai_thanh_phan`: `COMPLETE` 75, `INCOMPLETE` 15. Tập giá trị đầy đủ của `trang_thai` (ngoài `ACTIVE`) không biết được từ dữ liệu |

### 5.2. RPC

**`search_ingredients(p_search, p_limit)`** gọi được bằng `service_role` và `anon`.
- Cột trả về: `ma_nl` (số nguyên), `ten_nl` (text). **Không có `la_gia_vi_co_ban`.**
- Quan sát: `'ca chua'` và `'CÀ CHUA'` → Cà chua (`ma_nl` 46); `'hanh xanh'` → Hành lá (28), tức là tìm được qua từ đồng nghĩa; `'hanh'` → Hành (144), Hành boa rô (72), Hành lá (28) (thứ tự theo tên); `'%'` → mảng rỗng; **chuỗi rỗng `''` → trả về các nguyên liệu bất kỳ** (không phải mảng rỗng). Kết quả là mảng JSON thuần.

**`match_dishes(p_ingredient_ids, p_include_pantry, p_limit, p_offset)`**
- **`service_role` bị từ chối:** `42501 permission denied for table han_che_nguyen_lieu`. RPC chạy được bằng `anon` (đã thử với `p_ingredient_ids = [46, 28, 1]`, `p_include_pantry = true`, `p_limit = 3`, `p_offset = 0`).
- Cột trả về (mỗi phần tử):

| Cột | Kiểu quan sát | Ghi chú |
|---|---|---|
| `ma_mon` | số nguyên | |
| `ten_mon` | text | |
| `ma_ct` | số nguyên | Công thức được chọn |
| `ten_ct` | text | |
| `match_percent` | số, 2 chữ số thập phân (0–100) | Cả 3 dòng mẫu: `match_percent = matched_weight / total_weight × 100` (2/8 = 25.00; 4/20 = 20.00; 2/11 = 18.18) |
| `matched_weight` | số nguyên | |
| `total_weight` | số nguyên | |
| `missing_count` | số nguyên | |
| `missing_ingredients` | mảng JSON | Mỗi phần tử: `role`, `ma_nl`, `ten_nl`, `don_vi`, `so_luong`, `ghi_chu` |
| `readiness` | text | Chỉ quan sát giá trị `NEED_SHOPPING` (3 dòng, `missing_count` = 3, 9, 5). Các giá trị khác chưa quan sát |
| `is_incomplete` | boolean | Quan sát `false` |

- Kết quả sắp xếp theo `match_percent` giảm dần (3 dòng mẫu).
- **Không có** `hinh_anh` (ảnh món), `have_count`, `total_count`.
- Trong dòng mẫu thứ hai, `Dầu ăn` (`ma_nl` 5) và `Nước mắm` (`ma_nl` 13) vẫn nằm trong `missing_ingredients` dù `p_include_pantry = true`. Nguyên nhân tại `Dầu ăn`: `nguyen_lieu.la_gia_vi_co_ban = false` (xem 5.1). `Nước mắm` chưa kiểm tra.
- Công thức trọng số cụ thể (giá trị trọng số từng vai trò) và ngưỡng `readiness` **không suy ra được** từ ba dòng mẫu; giữ nguyên là chưa biết.
