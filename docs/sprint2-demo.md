# Kịch bản demo Sprint 2 (INT02)

> **Cập nhật:** 23/11/2026 (bản tích hợp INT02-c). Người soạn: TV1.
> **Bản đã kiểm chứng:** nhánh tích hợp tạm `linh/int02` (chỉ có trên máy TV1, chưa push), dựng lại từ `origin/main` bằng cách merge theo thứ tự: `origin/db`, `origin/linh/db-grants`, `origin/linh/be12-suggest-next` (gồm BE11, BE08), `origin/be09` (bản mới, 20:38 ngày 22/11), `origin/be10`, `origin/linh/be10-q4-filter` (KAN-257), `origin/huong/feat/FE07-FE09-suggest-tabs`.
> **Cách kiểm chứng:** backend chạy thật trên Supabase thật. Giao diện được kiểm chứng bằng cách chạy **chính các hook của Hương** (`useDishSuggestions`, `useIngredientMatch`) với `VITE_USE_MOCK_API=false`, `VITE_USE_MOCK=false` nối backend thật. **Chưa ai bấm thử trên trình duyệt**; cần một lượt chạy thử trên trình duyệt trước buổi demo.
> **Quy ước:** `✔` đã kiểm chứng như mô tả; `⚠` chạy nhưng có điểm cần tránh hoặc cần nói rõ; `✖` chưa chạy được.

---

## 0. Chuẩn bị

1. Lấy nhánh tích hợp (hiện chỉ local; khi các PR đã merge thì dùng `main`).
2. Backend: tạo `backend/.env` từ `backend/.env.example` (cần `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), rồi:
   ```
   cd backend && npm ci && npm start      # cổng 3000
   ```
   CORS mặc định cho `http://localhost:5173`; biến cấu hình tên là `CORS_ORIGINS` (không phải `FRONTEND_ORIGIN`).
3. Frontend (Vite proxy `/api` sang cổng 3000):
   ```
   cd frontend && npm ci
   VITE_USE_MOCK_API=false VITE_USE_MOCK=false npm run dev      # cổng 5173
   ```
   Phải đặt **cả hai** cờ: `VITE_USE_MOCK_API` (hai tab gợi ý, mặc định bật) và `VITE_USE_MOCK` (các service còn lại). Để `VITE_API_URL` trống khi chạy local.
4. Kiểm tra nhanh trước khi demo (đều phải `200`, riêng `/api/me` không token phải `401`):
   ```
   curl localhost:3000/api/health
   curl "localhost:3000/api/suggestions?limit=1"
   curl "localhost:3000/api/ingredients?search=ca%20chua"
   curl "localhost:3000/api/dishes/match?ingredients=5,6,8,11,28,55,57"
   curl localhost:3000/api/dishes/33/recipes
   ```

Kết quả chạy trên bản tích hợp: BE 233 test và 6 test `node --test` pass, FE 185 test pass, lint không lỗi (FE chỉ có cảnh báo), `npm run build` của FE thành công, `docs/qa05-route-regression.mjs` (nhánh `origin/hien/QA05`) báo `/api/me` trả `401 UNAUTHORIZED` ở cả bản `main` lẫn bản tích hợp.

---

## 1. Dữ liệu mẫu dùng khi demo

Dữ liệu thật trên Supabase ngày 23/11/2026: **72 món ACTIVE** (đều có ảnh và mô tả), 299 nguyên liệu, 90 công thức. **Dữ liệu DA04 chưa được nạp:** bảng `tag` và `mon_an_tag` còn 0 dòng, 0/72 món có `vung_mien`, 0/299 nguyên liệu có `la_gia_vi_co_ban = true`.

**Nguyên liệu** (ID cố định, có thể dùng trực tiếp qua API):

| ID | Tên | Gõ để chọn | Ghi chú |
|---|---|---|---|
| 46 | Cà chua | `ca chua`, `Cà chua` | |
| 28 | Hành lá | `hanh xanh`, `hành xanh` | Tìm ra bằng từ đồng nghĩa |
| 5 | Dầu ăn | `dau an` | Chưa được gán là gia vị cơ bản |
| 6 | Gia vị thông dụng | `gia vi thong dung` | Công thức ghi "tùy khẩu vị" |
| 8 | Gừng | `gung` | |
| 11 | Rượu trắng | `ruou trang` | |
| 55 | Khổ qua | `kho qua` | |
| 57 | Ngò rí | `ngo ri` | |
| 56 | Sườn heo | `suon heo` | Nguyên liệu còn thiếu của món 33 trong demo |

**Bộ nguyên liệu của món 33** (Canh khổ qua hầm xương, công thức 25, đủ dữ liệu, 8 nguyên liệu, 4 bước, 60 phút):
- Bộ **7** nguyên liệu (thiếu Sườn heo): `5, 6, 8, 11, 28, 55, 57`.
- Bộ **đủ 8**: thêm `56`.

**Vì sao bộ mẫu vẫn gồm Dầu ăn và Gia vị thông dụng:** cờ tủ bếp cơ bản chưa được nạp, nên hai nguyên liệu này không tự được tính là "đã có". Nếu bỏ chúng khỏi bộ (bộ `8, 11, 28, 55, 57`), món 33 chỉ còn khớp 5/8, thiếu Dầu ăn, Gia vị thông dụng và Sườn heo, nên rơi vào "Cần đi chợ" và BE12 không có gợi ý nào. Khi DA04 nạp cờ gia vị cơ bản (muối, đường, dầu ăn, nước mắm, tiêu), cần chạy lại các bước 5–8 ở mục 3 và cập nhật số liệu, vì kết quả sẽ thay đổi.

**Món:** 33 Canh khổ qua hầm xương (đủ dữ liệu); 17 Chả trứng và 81 Ốc nhồi hấp sả (công thức chưa đầy đủ); 64 Hàu nướng mỡ hành; 47 Cháo gà miền Bắc.

**Từ khóa tìm món:** `pho` ra 4 món (Phở bò, Phở bắp bò bằng nồi áp suất, ...); `canh khổ qua` ra 3 món; `max_cook_time=30` ra 10 món.

---

## 2. Luồng 1: Tab Gợi ý món (S2-01)

Vào `/goi-y`, tab **Gợi ý món**.

| Bước | Thao tác | Kết quả mong đợi | Kiểm chứng |
|---|---|---|---|
| 1 | Mở tab | Hiện một thẻ: **Chả trứng** (id 17), có ảnh, mô tả, 30 phút. Không chọn chip thì thẻ đầu luôn là món có id nhỏ nhất (cố định, không ngẫu nhiên) | ✔ |
| 2 | Bấm **Gợi ý khác** 3 lần | Các thẻ id 18, 19, 20, không lặp. Request sau cùng gửi `exclude=17,18,19` | ✔ |
| 3 | Bấm xem lại thẻ trước | Về thẻ trước, không gọi API mới | Theo code, chưa chạy |
| 4 | Bấm **Hôm nay ăn gì?** | Một món ngẫu nhiên, không thuộc các món đã xem (request có `random=true` và `exclude=` các món đã xem) | ✔ |
| 5 | Bấm **Gợi ý khác** đến khi hết | Sau đúng **72 thẻ**, không thẻ nào lặp, rồi hiện trạng thái hết món | ✔ |
| 6 | Ở trạng thái hết món, bấm **Bắt đầu lại** | Về thẻ đầu (id 17); request không còn `exclude` (lỗi KAN-255/256 đã hết) | ✔ |
| 7 | Bấm **Nấu món này** | Chuyển tới `/dishes/<id>`: hiện trang tạm "đang phát triển (FE10)" | ⚠ chờ FE10 |

**⚠ Tránh chip khi demo** (Trời mưa, Lười nấu, ...): bảng tag trên DB đang rỗng, nên chọn bất kỳ chip nào cũng ra "hết món" (kiểm chứng lại ngày 23/11). Nếu muốn, có thể dùng chính trạng thái này để minh họa "không tự nới bộ lọc" (QĐ 1.2), nhưng cần nói trước. Chip khẩu vị và vùng miền cũng chưa có dữ liệu.
Đổi chip rồi **Bắt đầu lại**, hoặc xóa chip, đều bắt đầu phiên mới và không còn gửi `exclude` cũ ✔ (sau khi bật chip: request `the=TROI_MUA` không có `exclude`; sau khi xóa chip về thẻ đầu id 17).

---

## 3. Luồng 2: Tab Theo nguyên liệu (S2-02)

Vào `/goi-y`, tab **Theo nguyên liệu**.

| Bước | Thao tác | Kết quả mong đợi | Kiểm chứng |
|---|---|---|---|
| 1 | Gõ `ca chua`, rồi `Cà chua` | Gợi ý **Cà chua** (46) cho cả hai | ✔ |
| 2 | Gõ `hanh xanh` | Gợi ý **Hành lá** (28), qua từ đồng nghĩa | ✔ |
| 3 | Gõ `xyzxyz` | "Không tìm thấy nguyên liệu này" | ✔ |
| 4 | Gõ một chữ rồi bấm Enter mà không chọn gợi ý | Không thêm gì (QĐ 4.1) | Theo code, chưa chạy |
| 5 | Chọn bộ 7 nguyên liệu của món 33 (mục 1), để công tắc Tủ bếp ở mặc định (bật), bấm tìm | **60 món**, chia nhóm: **Thiếu 1–2 thứ: 3**, **Cần đi chợ: 55**, **Chưa đủ dữ liệu để kết luận: 2**; không có nhóm Nấu ngay (nhóm rỗng không hiển thị) | ✔ |
| 6 | Xem nhóm Thiếu 1–2 thứ | Đầu nhóm là món 33: **87% khớp, "Có 7/8 nguyên liệu", chip thiếu "Sườn heo"**; tiếp theo là món 64 (50%, "Có 2/4") | ✔ |
| 7 | Xem nhóm Chưa đủ dữ liệu | Hai món có nhãn "chưa đầy đủ": 17 Chả trứng (33%, "Có 1/2") và 81 Ốc nhồi hấp sả (20%, "Có 2/10") | ✔ |
| 8 | Chọn thêm **Sườn heo** (56), tìm lại | **Nấu ngay: 1** gồm món 33 (100%, "Có 8/8"); Thiếu 1–2 thứ còn 2 món; Cần đi chợ: 55; Chưa đủ dữ liệu: 2 | ✔ |
| 9 | Bấm vào một món | Chuyển tới `/dishes/<id>` (trang tạm FE10) | ⚠ chờ FE10 |

Chỉ chọn **Cà chua** (46): 12 món, tất cả ở nhóm "Cần đi chợ" (không còn món khớp 0%).

**Về lọc Q4 (KAN-257, đã áp dụng):** danh sách chỉ gồm món có công thức chứa ít nhất một nguyên liệu bạn chọn; trước đó mọi truy vấn đều ra 72 món, trong đó 12–60 món khớp 0%. Danh sách "Cần đi chợ" của bộ 7 vẫn còn 55 món vì bộ này gồm Dầu ăn và Gia vị thông dụng, hai nguyên liệu có mặt trong hầu hết công thức. Khi trình bày, nên nhấn vào ba nhóm đầu.

**⚠ Điểm cần nói rõ khi demo:**
- **Công tắc Tủ bếp chưa làm thay đổi kết quả:** không nguyên liệu nào có `la_gia_vi_co_ban = true` (0/299), nên bật hay tắt đều ra cùng kết quả. Không nên demo công tắc cho đến khi DA04 nạp cờ này.
- Gõ `chua` **không** ra "Cà chua": tìm theo tiền tố, tìm theo từ ở giữa tên là backlog Sprint 3.

**Gợi ý "mua thêm" (BE12, chưa có giao diện; nhánh `origin/hien/FE11` của Hiền chưa được merge vào bản tích hợp):** gọi API trực tiếp.
```
curl "localhost:3000/api/ingredients/suggest-next?ingredients=5,6,8,11,28,55,57"
```
Kết quả mong đợi: một phần tử, nguyên liệu **Sườn heo** (id 56), `unlock_count` 1, `dish_ids` `[33]` ✔. Với bộ không có gia vị (`8,11,28,55,57`) kết quả là rỗng.

---

## 4. Luồng 3: Tìm món → chi tiết món → công thức (S2-03, S2-04)

**⚠ Giao diện chưa có (FE10, phụ trách Bảo; chưa thấy nhánh FE10 trên remote):** `/search`, `/dishes/:id`, `/recipes/:id` hiện chỉ là trang tạm "đang phát triển". Trang `/dishes` (danh sách món của Sprint 1) vẫn chạy. Vì vậy luồng này demo bằng API.

| Bước | Lệnh | Kết quả mong đợi | Kiểm chứng |
|---|---|---|---|
| 1 | `curl "localhost:3000/api/dishes?search=pho"` | 4 món; `Phở` và `pho` cho cùng kết quả (không phân biệt dấu) | ✔ |
| 2 | `curl "localhost:3000/api/dishes?max_cook_time=30"` | 10 món | ✔ |
| 3 | `curl "localhost:3000/api/dishes?page=0"` | `400 VALIDATION_ERROR` | ✔ |
| 4 | `curl localhost:3000/api/dishes/33` | Tên, ảnh, mô tả, `cook_time_minutes` 60, `flavor` `null`, `region` `null`, `tags` `[]`, `recipes` gồm công thức 25 (`servings` `null`, `incomplete` false, 8 nguyên liệu) | ✔ |
| 5 | `curl localhost:3000/api/dishes/33/recipes` | `200`, `meta.total` 1, một công thức (id 25, `ingredient_count` 8). Trước đây `404` (BUG-S2-002, đã hết) | ✔ |
| 6 | `curl localhost:3000/api/recipes/25` | 8 nguyên liệu (Dầu ăn 1 muỗng canh, ...; **Gia vị thông dụng** có `quantity` `null`, hiển thị "tùy khẩu vị"), 4 bước đúng thứ tự, 60 phút | ✔ |
| 7 | `curl localhost:3000/api/dishes/17` | `recipes` có công thức `incomplete: true` (dữ liệu thiếu, QĐ 1.5) | ✔ |
| 8 | `curl localhost:3000/api/dishes/999999/recipes`, `.../dishes/999999`, `.../recipes/999999` | `404 NOT_FOUND` | ✔ |
| 9 | `curl localhost:3000/api/dishes/abc/recipes`, `.../dishes/abc` | `400 VALIDATION_ERROR` | ✔ |
| 10 | `curl localhost:3000/api/me` (không token) | `401 UNAUTHORIZED` (BUG-S2-001, route `/me` vẫn gắn) | ✔ |

**Nhất quán `incomplete`:** trên 72 món và 89 công thức, trường `incomplete` của `/api/dishes/:id`, `/api/dishes/:id/recipes` và `/api/recipes/:id` trùng nhau và trùng quy tắc Q17 (`NOT du_thong_tin_huong_dan`) ở cả 3 nơi (0 chỗ lệch).
**Trả về rỗng do dữ liệu, không phải lỗi:** `?the=TROI_MUA` và `?flavor=CAY` ra 0 món (chưa có tag, chưa có nguồn khẩu vị). `servings` luôn `null` (PO chốt; thêm cột ở Sprint 3). Tham số `category` đã bị bỏ qua (không còn lọc).

---

## 5. Còn mock hoặc đang chặn, và chờ ai

| Việc | Tình trạng | Chờ ai |
|---|---|---|
| Trang `/search`, `/dishes/:id`, `/recipes/:id` (FE10) | Trang tạm; luồng 3 demo bằng API | Bảo |
| Dữ liệu tag (`tag`, `mon_an_tag`, slug dạng `troi-mua`) | 0 dòng: chip luôn "hết món" | DA04 (Châu) |
| `la_gia_vi_co_ban` cho muối, đường, dầu ăn, nước mắm, tiêu | 0/299 nguyên liệu: công tắc Tủ bếp vô tác dụng; số liệu mục 3 sẽ đổi khi nạp | DA04 / TV3 |
| `vung_mien`, nguồn khẩu vị (`flavor`) | 0/72 món có vùng miền; `flavor` luôn `null`; `thuoc_tinh_mon` vẫn bị từ chối `403` với `service_role` | DA04 / TV3 (Sprint 3) |
| Công thức thiếu dữ liệu (ví dụ món 17, 81) | Nhãn "chưa đầy đủ" | DA04 (Châu) |
| Gỡ dependency `d` không dùng khỏi `backend/package.json`; thêm test cho BE09 và BE10; chuyển SQL BE09 (`supabase/202611220002_be09_catalog_read.sql`) vào `migrations/` và `apply.sql` | Chưa làm (nhánh `be09` và `be10` hiện vẫn vậy) | Châu |
| PR cho BE11, BE08, BE12, KAN-257 (`linh/be10-q4-filter`) và `linh/db-grants` | Các nhánh đã có trên remote; chưa rõ PR. BE12 xếp chồng trên BE08, BE08 trên BE11; `be10` xếp trên `be09` cũ nên phải giữ bản `be09` mới khi merge (đã làm ở nhánh tích hợp) | TV1, reviewer TV3 |
| Giao diện gợi ý nguyên liệu mua thêm (FE11) | P1; nhánh `origin/hien/FE11` chưa merge vào bản tích hợp | Hiền |
| Câu hỏi mở Q5 và chữ ký xác nhận contract (mục 7.12 của `api.md`) | Chưa có chữ ký TV2, TV3, TV4 | TV2, TV3, TV4 |

---

## 6. Các lệch của BE09/BE10 so với contract: tình trạng sau bản mới

Đối chiếu trên bản tích hợp (ngày 23/11/2026).

| Lệch đã review ngày 22/11 | Tình trạng |
|---|---|
| Thiếu lọc Q4 (món khớp 0% vẫn trả về) | **Đã xử lý** ở KAN-257 (`linh/be10-q4-filter`) |
| `readiness` của món chưa đầy đủ luôn `NEED_SHOPPING` | **Đã xử lý** ở KAN-257 |
| Sắp xếp lại kết quả, mất thứ tự RPC | **Đã xử lý** ở KAN-257 |
| Thiếu `GET /api/dishes/:id/recipes` | **Đã xử lý** ở bản `be09` mới |
| `tags[]` trả slug thô | **Đã xử lý** ở bản `be09` mới (SQL ánh xạ sang mã in hoa); chưa thấy được bằng dữ liệu vì bảng tag rỗng |
| `incomplete` tính nhiều kiểu, khác Q17 | **Đã xử lý** ở bản `be09` mới; 0 chỗ lệch trên 89 công thức |
| Tham số `category` ngoài contract | **Đã xử lý** ở bản `be09` mới (controller không còn nhận; tham số SQL còn giữ để tương thích) |
| Dependency `d` không dùng (kèm khoảng 108 dòng lockfile) | **Chưa xử lý**; để Châu tự gỡ |
| Không có test cho BE09 và BE10 | **Chưa xử lý** (KAN-257 chỉ thêm test cho phần lọc) |
| SQL BE09 nằm ngoài `supabase/migrations/` và `apply.sql` | **Chưa xử lý** |
