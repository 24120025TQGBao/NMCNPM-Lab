# Kịch bản demo Sprint 2 (INT02)

> **Cập nhật:** 23/11/2026. Người soạn: TV1.
> **Cách đã kiểm chứng:** nhánh tích hợp tạm `linh/int02` (chỉ có trên máy TV1, chưa push) gồm BE11, BE08, BE12 của TV1, BE09 + BE10 của Châu (`origin/be10`) và FE07–FE09 của Hương (`origin/huong/feat/FE07-FE09-suggest-tabs`). Backend chạy thật trên Supabase thật. Giao diện được kiểm chứng bằng cách chạy **chính các hook của Hương** (`useDishSuggestions`, `useIngredientSearch`, `useIngredientMatch`) với `VITE_USE_MOCK_API=false`, `VITE_USE_MOCK=false` nối backend thật. **Chưa ai bấm thử trên trình duyệt**; cần một lượt chạy thử trên trình duyệt trước buổi demo.
> **Quy ước:** `✔` đã kiểm chứng như mô tả; `⚠` chạy nhưng có điểm cần tránh hoặc cần nói rõ khi demo; `✖` chưa chạy được.

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
4. Kiểm tra nhanh trước khi demo (đều phải `200`):
   ```
   curl localhost:3000/api/health
   curl "localhost:3000/api/suggestions?limit=1"
   curl "localhost:3000/api/ingredients?search=ca%20chua"
   curl "localhost:3000/api/dishes/match?ingredients=5,6,8,11,28,55,57"
   ```

---

## 1. Dữ liệu mẫu dùng khi demo

Dữ liệu thật trên Supabase ngày 23/11/2026: **72 món ACTIVE** (đều có ảnh và mô tả), 90 công thức; chưa có tag, chưa món nào có vùng miền.

**Nguyên liệu** (ID cố định, có thể dùng trực tiếp qua API):

| ID | Tên | Gõ để chọn | Ghi chú |
|---|---|---|---|
| 46 | Cà chua | `ca chua`, `Cà chua` | |
| 28 | Hành lá | `hanh xanh`, `hành xanh` | Tìm ra bằng từ đồng nghĩa |
| 1 | Trứng | `trung` | |
| 5 | Dầu ăn | `dau an` | |
| 6 | Gia vị thông dụng | `gia vi thong dung` | Công thức ghi "tùy khẩu vị" |
| 8 | Gừng | `gung` | |
| 11 | Rượu trắng | `ruou trang` | |
| 55 | Khổ qua | `kho qua` | |
| 57 | Ngò rí | `ngo ri` | |
| 56 | Sườn heo | `suon heo` | Nguyên liệu còn thiếu của món 33 trong demo |

**Bộ nguyên liệu của món 33** (Canh khổ qua hầm xương, công thức 25, đủ dữ liệu, 8 nguyên liệu, 4 bước, 60 phút):
- Bộ **7** nguyên liệu (thiếu Sườn heo): `5, 6, 8, 11, 28, 55, 57`.
- Bộ **đủ 8**: thêm `56`.

**Món:** 33 Canh khổ qua hầm xương (đủ dữ liệu); 17 Chả trứng (công thức chưa đầy đủ, có công thức không có nguyên liệu); 18 (công thức không có nguyên liệu, `Có 0/0`); 64 Hàu nướng mỡ hành; 47 Cháo gà miền Bắc.

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

**⚠ Tránh chip khi demo** (Trời mưa, Lười nấu, ...): bảng tag trên DB đang rỗng, nên chọn bất kỳ chip nào cũng ra "hết món". Nếu muốn, có thể dùng chính trạng thái này để minh họa "không tự nới bộ lọc" (QĐ 1.2), nhưng cần nói trước. Chip khẩu vị/vùng miền cũng chưa có dữ liệu.
Đổi chip rồi **Bắt đầu lại** hoặc tắt chip đều bắt đầu phiên mới, không còn gửi `exclude` cũ ✔.

---

## 3. Luồng 2: Tab Theo nguyên liệu (S2-02)

Vào `/goi-y`, tab **Theo nguyên liệu**.

| Bước | Thao tác | Kết quả mong đợi | Kiểm chứng |
|---|---|---|---|
| 1 | Gõ `ca chua`, rồi `Cà chua` | Gợi ý **Cà chua** (46) cho cả hai | ✔ |
| 2 | Gõ `hanh xanh` | Gợi ý **Hành lá** (28), qua từ đồng nghĩa | ✔ |
| 3 | Gõ `xyzxyz` | "Không tìm thấy nguyên liệu này" | ✔ |
| 4 | Gõ một chữ rồi bấm Enter mà không chọn gợi ý | Không thêm gì (QĐ 4.1) | Theo code, chưa chạy |
| 5 | Chọn bộ 7 nguyên liệu của món 33 (bảng mục 1), để công tắc Tủ bếp ở mặc định (bật), bấm tìm | Kết quả 72 món chia nhóm: **Thiếu 1–2 thứ: 3**, **Cần đi chợ: 64**, **Chưa đủ dữ liệu để kết luận: 5**, **Nấu ngay: 0** (không hiện nhóm rỗng) | ✔ |
| 6 | Xem nhóm Thiếu 1–2 thứ | Đầu nhóm là món 33: **87% khớp, "Có 7/8 nguyên liệu", chip thiếu "Sườn heo"**; tiếp theo là 64 và 21 | ✔ |
| 7 | Xem nhóm Chưa đủ dữ liệu | Có "chưa đầy đủ": món 17, 81, 18, 19, 20 | ✔ |
| 8 | Chọn thêm **Sườn heo** (56), tìm lại | Nhóm **Nấu ngay: 1** gồm món 33 (100%, "Có 8/8"); Thiếu 1–2 thứ còn 2 món | ✔ |
| 9 | Bấm vào một món | Chuyển tới `/dishes/<id>` (trang tạm FE10) | ⚠ chờ FE10 |

**⚠ Điểm cần nói rõ khi demo:**
- **Danh sách "Cần đi chợ" rất dài** (64–67 món), gồm cả món khớp 0% (12 món với bộ 7 nguyên liệu; 60 món khi chỉ chọn Cà chua). BE10 chưa lọc theo quy tắc Q4 ("chỉ món có công thức chứa ít nhất một nguyên liệu bạn chọn"). Nên chọn bộ nguyên liệu như bước 5 và chỉ trình bày ba nhóm đầu.
- **Công tắc Tủ bếp chưa làm thay đổi kết quả:** tắt công tắc cho đúng cùng kết quả vì chưa nguyên liệu nào được gán cờ gia vị cơ bản (`la_gia_vi_co_ban = false` cho cả Dầu ăn). Không nên demo công tắc.
- **"Có 0/0 nguyên liệu"** ở các món chưa đầy đủ có công thức không có nguyên liệu (ví dụ món 18).
- Gõ `chua` **không** ra "Cà chua": tìm theo tiền tố, tìm theo từ ở giữa tên là backlog Sprint 3.

**Gợi ý "mua thêm" (BE12, chưa có giao diện, FE11 là P1):** gọi API trực tiếp.
```
curl "localhost:3000/api/ingredients/suggest-next?ingredients=5,6,8,11,28,55,57"
```
Kết quả mong đợi: một phần tử, nguyên liệu **Sườn heo** (id 56), `unlock_count` 1, `dish_ids` `[33]` ✔. Với `&pantry=false` cùng kết quả.

---

## 4. Luồng 3: Tìm món → chi tiết món → công thức (S2-03, S2-04)

**⚠ Giao diện chưa có (FE10, phụ trách Bảo):** `/search`, `/dishes/:id`, `/recipes/:id` hiện chỉ là trang tạm "đang phát triển". Trang `/dishes` (danh sách món của Sprint 1) vẫn chạy. Vì vậy luồng này demo bằng API, và các mapper của frontend (`mapDishList`, `mapRecipeSummary`, `mapRecipeDetail`) đã được chạy trên phản hồi thật ✔.

| Bước | Lệnh | Kết quả mong đợi | Kiểm chứng |
|---|---|---|---|
| 1 | `curl "localhost:3000/api/dishes?search=pho"` | 4 món; `Phở` và `pho` cho cùng kết quả (không phân biệt dấu) | ✔ |
| 2 | `curl "localhost:3000/api/dishes?max_cook_time=30"` | 10 món | ✔ |
| 3 | `curl "localhost:3000/api/dishes?page=0"` | `400 VALIDATION_ERROR` | ✔ |
| 4 | `curl localhost:3000/api/dishes/33` | Tên, ảnh, mô tả, `cook_time_minutes` 60, `flavor` `null`, `region` `null`, `tags` `[]`, `recipes` gồm công thức 25 (`servings` `null`, `incomplete` false, 8 nguyên liệu) | ✔ |
| 5 | `curl localhost:3000/api/recipes/25` | 8 nguyên liệu (Dầu ăn 1 muỗng canh, ...; **Gia vị thông dụng** có `quantity` `null`, hiển thị "tùy khẩu vị"), 4 bước đúng thứ tự, 60 phút | ✔ |
| 6 | `curl localhost:3000/api/dishes/17` | `recipes` có công thức `incomplete: true` (dữ liệu thiếu, QĐ 1.5) | ✔ |
| 7 | `curl localhost:3000/api/dishes/999999`, `.../recipes/999999` | `404 NOT_FOUND` | ✔ |
| 8 | `curl localhost:3000/api/dishes/abc` | `400 VALIDATION_ERROR` | ✔ |

**Trả về rỗng do dữ liệu, không phải lỗi:** `?the=TROI_MUA`, `?flavor=CAY`, `?category=SOUP` đều ra 0 món (chưa có tag, chưa có nguồn khẩu vị). `servings` luôn `null` (PO chốt; thêm cột ở Sprint 3).
**Chưa có:** `GET /api/dishes/:id/recipes` trả `404` (chưa được BE09 làm).

---

## 5. Còn mock hoặc đang chặn, và chờ ai

| Việc | Tình trạng | Chờ ai |
|---|---|---|
| Trang `/search`, `/dishes/:id`, `/recipes/:id` (FE10) | Trang tạm; luồng 3 demo bằng API | Bảo |
| Dữ liệu tag (`tag`, `mon_an_tag`) và slug dạng `troi-mua` | Bảng rỗng: chip luôn "hết món" | DA04 (Châu) |
| `la_gia_vi_co_ban` cho muối, đường, dầu ăn, nước mắm, tiêu | Chưa gán: công tắc Tủ bếp vô tác dụng | DA04 / TV3 |
| `vung_mien`, nguồn khẩu vị (`flavor`) | Chưa có dữ liệu; `flavor` luôn `null` | DA04 / TV3 (Sprint 3) |
| Công thức không có nguyên liệu (ví dụ món 17, 18) | Hiện "Có 0/0", `incomplete` | DA04 (Châu) |
| Lọc Q4 và các lệch contract của BE09/BE10 (mục 6) | Cần sửa trên `origin/be10` | Châu |
| PR cho BE11, BE08, BE12 (TV1) và `linh/db-grants` | Chưa push, chưa mở PR; nhánh BE12 xếp chồng trên BE08, BE08 trên BE11 | TV1, reviewer TV3 |
| Giao diện gợi ý nguyên liệu mua thêm (FE11) | P1, chưa làm | TV5 |
| Câu hỏi mở Q5 và chữ ký xác nhận contract (mục 7.12 của `api.md`) | Chưa có chữ ký TV2, TV3, TV4 | TV2, TV3, TV4 |

---

## 6. Các lệch của BE09/BE10 và ảnh hưởng thật

Đối chiếu `origin/be09`, `origin/be10` với `docs/api.md` mục 7 và chạy thật trên dữ liệu ngày 23/11/2026.

| Lệch so với contract | Thấy trên giao diện? |
|---|---|
| Thiếu lọc Q4 (món khớp 0% vẫn trả về) | **Có.** Nhóm "Cần đi chợ" dài, chứa món không liên quan |
| Thiếu `GET /api/dishes/:id/recipes` | Chưa (FE10 chưa dùng); sẽ lộ khi FE10 gọi |
| `tags[]` trả slug thô (`troi-mua`) thay vì `TROI_MUA` | Chưa (tag đang rỗng); sẽ lộ khi DA04 nạp tag |
| `incomplete` của công thức tính hai kiểu khác nhau (chi tiết món và chi tiết công thức) và khác Q17 | Chưa: trên 89 công thức, hai bên trùng nhau và trùng Q17 |
| `readiness` của món chưa đầy đủ luôn là `NEED_SHOPPING` (contract: tính theo số thiếu) | Chưa: giao diện xếp nhóm theo `is_incomplete`, không dùng `readiness` cho nhóm 4 |
| Sắp xếp lại kết quả theo `match_ratio` rồi `id` (RPC: rồi ít thiếu hơn) | Rất nhẹ: thứ tự khác trong nhóm "Cần đi chợ" khi hai món cùng tỷ lệ |
| Tham số `category` ngoài contract; `flavor`/`category` dựa trên tên nhóm `thuoc_tinh_mon` đoán trước | Không thấy |
| Không có test mới; thêm dependency `d` không dùng | Không thấy |

Bug phía frontend (Hương): hiện `Có 0/0 nguyên liệu` khi `totalCount` bằng 0 (thẻ món ở nhóm "Chưa đủ dữ liệu"); mức độ thấp.
