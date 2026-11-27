# Kịch bản demo Sprint 2 (INT02)

> **Cập nhật:** 24/11/2026 (bản tích hợp INT03). Người soạn: TV1.
> **Bản đã kiểm chứng:** nhánh tích hợp tạm `linh/int03` (chỉ có trên máy TV1, chưa push), dựng từ `origin/main` (`413a7b6`, đã gồm INT02) bằng cách merge theo thứ tự: `origin/linh/sprint2-po-be` (`72be7e1`) → `origin/be09` (`c7ceb72`) → `origin/db` (`a4db348`) → FE10 `origin/feature/fe04_search-dishes_dishes-info_recipe-info` (`587171e`) → `origin/hien/FE11` (`4dace80`). Không merge `origin/revert-32-linh/int02`.
> **Cách kiểm chứng:** backend chạy thật trên Supabase thật, chỉ gọi GET (bảng số liệu ở mục 3–4 chạy lại ngày 24/11 trên bản này). Phần giao diện (luồng 3 và FE11) **chưa được TV1 bấm thử trên trình duyệt trong INT03**: kết quả giao diện lấy từ test tự động của bản tích hợp (FE 227 test pass) và bằng chứng trình duyệt của Bảo (`docs/catalog-qa-2026-11-24/`, dùng mock) và Hiền (`docs/fe11-browser-evidence/`; QA05 trên nhánh `origin/hien/QA05`). Cần một lượt bấm thử trên trình duyệt trước buổi demo.
> **Quy ước:** `✔` đã kiểm chứng như mô tả; `⚠` chạy nhưng có điểm cần tránh hoặc cần nói rõ; `✖` chưa chạy được.

---

## 0. Chuẩn bị

1. Lấy nhánh tích hợp (hiện chỉ local `linh/int03`; khi các PR đã merge thì dùng `main`).
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

Kết quả chạy trên bản tích hợp INT03 (24/11/2026): BE lint không lỗi; BE **258 test Vitest** (11 file) và **10 test `node --test`** pass; FE lint không lỗi (4 cảnh báo có sẵn của phần gợi ý/nguyên liệu); FE **227 test** (29 file) pass; `npm run build` của FE thành công (chỉ cảnh báo bundle lớn hơn 500 kB); `docs/qa05-route-regression.mjs` (lấy từ `origin/hien/QA05`, so `origin/main` với bản tích hợp) báo `/api/me` trả `401 UNAUTHORIZED` ở cả hai.

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
| 7 | Bấm **Nấu món này** | Chuyển tới `/dishes/<id>` (trang chi tiết món của FE10, xem luồng 3) | ⚠ xem lưu ý bên dưới |

**⚠ Lưu ý khi sang chi tiết món (BUG-S2-005):** link **Quay lại tìm món** trên trang chi tiết luôn về `/search`, không về `/goi-y`. Khi demo hãy dùng nút **Back của trình duyệt** (giữ đúng thẻ/tab trước đó theo QA05).

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
| 9 | Bấm vào một món | Chuyển tới `/dishes/<id>` (FE10, xem luồng 3). Quay lại bằng nút Back của trình duyệt, không dùng link "Quay lại tìm món" (BUG-S2-005) | ⚠ |

Chỉ chọn **Cà chua** (46): 12 món, tất cả ở nhóm "Cần đi chợ" (không còn món khớp 0%).

**Về lọc Q4 (KAN-257, đã áp dụng):** danh sách chỉ gồm món có công thức chứa ít nhất một nguyên liệu bạn chọn; trước đó mọi truy vấn đều ra 72 món, trong đó 12–60 món khớp 0%. Danh sách "Cần đi chợ" của bộ 7 vẫn còn 55 món vì bộ này gồm Dầu ăn và Gia vị thông dụng, hai nguyên liệu có mặt trong hầu hết công thức. Khi trình bày, nên nhấn vào ba nhóm đầu.

**⚠ Điểm cần nói rõ khi demo:**
- **Công tắc Tủ bếp chưa làm thay đổi kết quả:** không nguyên liệu nào có `la_gia_vi_co_ban = true` (0/299), nên bật hay tắt đều ra cùng kết quả. Không nên demo công tắc cho đến khi DA04 nạp cờ này.
- Gõ `chua` **không** ra "Cà chua": tìm theo tiền tố, tìm theo từ ở giữa tên là backlog Sprint 3.

**Gợi ý "mua thêm" (BE12 + FE11, Hiền; bản tích hợp INT03 đã có giao diện).** API (✔ chạy lại 24/11):
```
curl "localhost:3000/api/ingredients/suggest-next?ingredients=5,6,8,11,28,55,57"
```
Kết quả: một phần tử, nguyên liệu **Sườn heo** (id 56), `unlock_count` 1, `dish_ids` `[33]`. Với bộ không có gia vị (`8,11,28,55,57`) kết quả là `data: []`.

Giao diện FE11 (theo `docs/fe11-validation.md`; ⚠ chưa bấm lại trong INT03), tab **Theo nguyên liệu**:

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| F1 | Chọn bộ **7** nguyên liệu của món 33 (mục 1), bấm **Tìm món** | Món 33: 87% (0,8667), "Có 7/8", thiếu **Sườn heo**; hiện mục **Mua thêm** với gợi ý Sườn heo (mở khóa 1 món: 33) |
| F2 | Bấm **Đã có nguyên liệu này** trên gợi ý Sườn heo, rồi **Tìm món** | Món 33 lên 100%, "Có 8/8", vào nhóm **Nấu ngay** |
| F3 | (tùy chọn) Tick món 33, bấm **Sao chép danh sách đi chợ** | Clipboard chỉ có `- Sườn heo` |
| F4 | (tùy chọn) Ghim **Khổ qua** (55) | Món chứa Khổ qua lên đầu nhóm **Cần đi chợ**, không đổi nhóm hoặc % khớp; bỏ ghim trả lại thứ tự của API |

---

## 4. Luồng 3: Tìm món → chi tiết món → công thức (S2-03, S2-04)

Giao diện của FE10 (Bảo) đã có trong bản tích hợp: `/search`, `/dishes/:id`, `/dishes/:id/recipes`, `/recipes/:id`. Thông tin bàn giao: `docs/catalog-handoff.md`.

**Chạy luồng trên giao diện** (⚠ chưa bấm lại trong INT03; số món lấy từ API thật, bảng ở dưới):

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| U1 | Mở `/search`, gõ `pho bo`, rồi `Phở bò` | Cùng kết quả, không phân biệt hoa/thường và dấu. Gõ `pho` ra 4 món |
| U2 | Chọn **Thời gian chế biến: Tối đa 30 phút** (xóa từ khóa) | 10 món (kết hợp AND với từ khóa nếu có) |
| U3 | Gõ từ khóa không có (ví dụ `xyzxyz`) | Thông báo không tìm thấy món phù hợp |
| U4 | Gõ `canh khổ qua`, bấm vào **Canh khổ qua hầm xương** | `/dishes/33`: tên, ảnh, mô tả, nút **Tự nấu**, nút **Quán ăn · Sắp có** bị vô hiệu hóa |
| U5 | Bấm **Tự nấu** | `/dishes/33/recipes`: một công thức (Canh khổ qua hầm xương, 60 phút, khẩu phần "Chưa cập nhật"). Không tự vào thẳng công thức |
| U6 | Bấm **Xem công thức** | `/recipes/25`: 8 nguyên liệu (**Gia vị thông dụng** hiện "Tùy khẩu vị"), 4 bước đánh số, 60 phút |
| U7 | Mở `/dishes/17` rồi vào công thức | Công thức có cảnh báo chưa đầy đủ (QĐ 1.5) |
| U8 | Mở `/dishes/999999` | Trang "không còn tồn tại" có đường quay về |
| U9 | Dùng **Back của trình duyệt** từ chi tiết về `/search` | Giữ từ khóa, bộ lọc và trang |

**⚠ Tránh hoặc nói rõ khi demo** (bug đã biết ở FE10, chưa sửa; chi tiết trong `docs/qa05-bugs-2026-11-24.md` trên `origin/hien/QA05`):
- **Không dùng bộ lọc Loại món và Khẩu vị** trên `/search`: lọc loại món/khẩu vị đã **DEFERRED Sprint 3** (AC S2-03.2). `GET /api/dishes/categories` hiện trả `500` (PostgreSQL `42501`, `service_role` chưa có `SELECT` trên `thuoc_tinh_mon`) nên dropdown Loại món báo lỗi; chọn khẩu vị luôn ra 0 món vì `flavor` luôn `null`.
- **BUG-S2-003:** trang `/dishes/:id` không hiện thời gian chế biến (API có `cook_time_minutes` = 60 với món 33). Thời gian có ở trang danh sách công thức và công thức.
- **BUG-S2-004:** trang `/dishes/:id` của món không có công thức không báo "chưa có công thức" trước khi bấm Tự nấu (trang danh sách công thức mới báo rỗng). Chưa kiểm tra xem dữ liệu thật có món nào như vậy không; QA05 tái hiện bằng fixture HTTP.
- **BUG-S2-005:** link **Quay lại tìm món** luôn về `/search`, mất trạng thái `/goi-y`. Dùng nút Back của trình duyệt.

**Chạy luồng bằng API** (✔ chạy lại 24/11/2026 trên bản INT03, backend thật; thay thế khi giao diện lỗi):

| Bước | Lệnh | Kết quả mong đợi | Kiểm chứng |
|---|---|---|---|
| 1 | `curl "localhost:3000/api/dishes?search=pho"` | 4 món (`meta.total` 4); `Phở` và `pho` cho cùng kết quả | ✔ |
| 2 | `curl "localhost:3000/api/dishes?max_cook_time=30"` | `meta.total` 10 | ✔ |
| 3 | `curl "localhost:3000/api/dishes?page=0"` | `400 VALIDATION_ERROR` | ✔ |
| 4 | `curl localhost:3000/api/dishes/33` | Tên, ảnh, mô tả, `cook_time_minutes` 60, `flavor` `null`, `region` `null`, `tags` `[]`, `recipes` gồm công thức 25 (`servings` `null`, `incomplete` false, 8 nguyên liệu) | ✔ |
| 5 | `curl localhost:3000/api/dishes/33/recipes` | `200`, `meta.total` 1, một công thức (id 25, `ingredient_count` 8) | ✔ |
| 6 | `curl localhost:3000/api/recipes/25` | 8 nguyên liệu (**Gia vị thông dụng** có `quantity` `null`), 4 bước đúng thứ tự, 60 phút | ✔ |
| 7 | `curl localhost:3000/api/dishes/17` | `recipes` gồm 3 công thức (6, 7, 89), tất cả `incomplete: true` | ✔ |
| 8 | `curl localhost:3000/api/dishes/999999/recipes`, `.../dishes/999999`, `.../recipes/999999` | `404 NOT_FOUND` | ✔ |
| 9 | `curl localhost:3000/api/dishes/abc/recipes`, `.../dishes/abc` | `400 VALIDATION_ERROR` | ✔ |
| 10 | `curl localhost:3000/api/me` (không token) | `401 UNAUTHORIZED` | ✔ |
| 11 | `curl localhost:3000/api/dishes/categories` | **`500 INTERNAL_ERROR`** (quyền `thuoc_tinh_mon`, xem trên). Ngoài contract v2.0; chỉ dùng để minh họa nếu bị hỏi | ✔ (lỗi đã biết) |

**Trả về rỗng do dữ liệu, không phải lỗi:** `?the=TROI_MUA` và `?flavor=CAY` ra 0 món (chưa có tag, chưa có nguồn khẩu vị). `servings` luôn `null` (PO chốt; thêm cột ở Sprint 3). Tham số `category` **được nhận lại** từ FE10 (mã `A-Z0-9_`); chưa có dữ liệu loại món nên chưa lọc được gì có ý nghĩa.

---

## 5. Còn mock hoặc đang chặn, và chờ ai

| Việc | Tình trạng | Chờ ai |
|---|---|---|
| Bug FE10: ẩn lọc loại món/khẩu vị (S2-03.2), BUG-S2-003, S2-004, S2-005 | Chưa sửa (INT03 không sửa FE10); danh sách cho Bảo ở báo cáo INT03 | Bảo; S2-005 phối hợp Hương (FE09 truyền return path) |
| `GET /api/dishes/categories` trả 500 (thiếu `GRANT SELECT` trên `thuoc_tinh_mon` cho `service_role`) | Endpoint và dropdown nằm ngoài contract v2.0, lọc loại món dời Sprint 3 | PO quyết giữ hay bỏ; TV3/Bảo nếu giữ |
| Dữ liệu tag (`tag`, `mon_an_tag`, slug dạng `troi-mua`) | 0 dòng: chip luôn "hết món" | DA04 (Châu) |
| `la_gia_vi_co_ban` cho muối, đường, dầu ăn, nước mắm, tiêu | 0/299 nguyên liệu: công tắc Tủ bếp vô tác dụng; số liệu mục 3 sẽ đổi khi nạp | DA04 / TV3 |
| `vung_mien`, nguồn khẩu vị (`flavor`) | 0/72 món có vùng miền; `flavor` luôn `null` | DA04 / TV3 (Sprint 3) |
| Công thức thiếu dữ liệu (ví dụ món 17, 81) | Nhãn "chưa đầy đủ" | DA04 (Châu) |
| Hai file GRANT trùng: `supabase/migrations/202611220002_service_role_recipe_read.sql` (nhánh `db`) và `202611230001_service_role_grants.sql` (main) | Giữ cả hai trong bản tích hợp, cả hai đều có trong `apply.sql`, chạy lại vô hại | Bảo quyết định xóa một |
| SQL BE09 (`supabase/202611220002_be09_catalog_read.sql`) nằm ngoài `supabase/migrations/` và `apply.sql`; nhánh `be09` còn xóa 4 dòng ghi chú đầu file | Chưa xử lý | Châu / Bảo |
| PR cho BE11, BE08, BE12, KAN-257 (`linh/be10-q4-filter`) và `linh/db-grants` | Nội dung đã nằm trong `main` qua PR #32; PR #33 (`revert-32-linh/int02`) đang đề xuất revert PR #32 | Nhóm quyết định PR #33 |
| Câu hỏi mở Q5 và chữ ký xác nhận contract (mục 7.12 của `api.md`) | Chưa có chữ ký TV2, TV3, TV4 | TV2, TV3, TV4 |
| Điểm khác giữa mô tả FE10/BE09 và contract v2.0 | Liệt kê ở `docs/catalog-handoff.md`, mục "Điểm khác contract v2.0"; contract không bị sửa | PO |

---

## 6. Các lệch của BE09/BE10 so với contract: tình trạng sau INT03

| Lệch đã review ngày 22/11 | Tình trạng |
|---|---|
| Thiếu lọc Q4 (món khớp 0% vẫn trả về) | **Đã xử lý** ở KAN-257 |
| `readiness` của món chưa đầy đủ luôn `NEED_SHOPPING` | **Đã xử lý** ở KAN-257 |
| Sắp xếp lại kết quả, mất thứ tự RPC | **Đã xử lý** ở KAN-257 |
| Thiếu `GET /api/dishes/:id/recipes` | **Đã xử lý** ở bản `be09` mới |
| `tags[]` trả slug thô | **Đã xử lý** ở bản `be09` mới; chưa thấy được bằng dữ liệu vì bảng tag rỗng |
| `incomplete` tính nhiều kiểu, khác Q17 | **Đã xử lý** ở bản `be09` mới |
| Tham số `category` ngoài contract | **Quay lại** từ FE10 (controller nhận `category`, thêm `/api/dishes/categories`); ghi ở `docs/catalog-handoff.md` |
| Dependency `d` không dùng | **Đã xử lý** trong INT03 (commit `[INT03] remove unused dependency d`; không có import/require ở BE hoặc FE) |
| Không có test cho BE09 và BE10 | BE09 đã có `backend/tests/be09.test.js`; test BE10 còn do KAN-257 chỉ phủ phần lọc |
| SQL BE09 nằm ngoài `supabase/migrations/` và `apply.sql` | **Chưa xử lý** |
