# Acceptance Criteria Sprint 2 — "Hôm nay ăn gì?"

> **Trạng thái:** Đã được PO duyệt, đã tích hợp các quyết định của nhóm (PO02 / KAN-232). Người soạn: TV1.
> **Hạn Sprint 2:** chưa có ngày, điền khi nhóm chốt. Các hạn cũ trên Jira (15/11–21/11) chỉ dùng để biết thứ tự ưu tiên.
> **Nguồn:** mô tả các issue Jira KAN-232…KAN-254 (trích 22/11/2026) và các quy định nghiệp vụ (QĐ) trong `report.md`.
> **Ký hiệu:** `[P0]` bắt buộc cho Sprint Goal; `[P1]` làm nếu còn thời gian; `[tạm thời]` là giá trị sẽ chốt theo nguồn khác (xem mục 6).

---

## 1. Sprint Goal

> Người dùng nhận gợi ý món (tab Gợi ý món), nhập nguyên liệu để xem món nấu được kèm mức khớp (tab Theo nguyên liệu), tìm món và xem công thức.

Mọi tính năng Sprint 2 **dùng được khi chưa đăng nhập** (khách).

---

## 2. Quy ước chung cho mọi story

- **Chỉ món `ACTIVE`** xuất hiện ở gợi ý, đối sánh, tìm kiếm và chi tiết. Món `HIDDEN`/`DELETED` không lộ ra, kể cả khi gọi API trực tiếp bằng ID.
- **Mọi màn hình gọi API có đủ 3 trạng thái:** đang tải; lỗi (thông báo thân thiện, không lộ chi tiết nội bộ, có nút Thử lại); rỗng (thông báo riêng, không coi là lỗi).
- **Mã trả về:** tham số sai → 400; không tìm thấy một tài nguyên cụ thể → 404; không có kết quả của một truy vấn danh sách → 200 + danh sách rỗng; lỗi hệ thống → 500 (không kèm stack trace, tên bảng hoặc câu SQL).
- **Quay lại từ trang chi tiết thì giữ nguyên danh sách và tiêu chí** của màn hình trước (QĐ 1.4).
- Thứ tự kết quả do API quyết định; frontend giữ nguyên thứ tự.

### Quy định nghiệp vụ được tham chiếu (từ `report.md`)

| QĐ | Nội dung | Trong Sprint 2 |
|---|---|---|
| 1.1 | Chỉ gợi ý món hợp lệ, không lặp trong phiên, xem lại được lượt trước | S2-01 |
| 1.2 | Áp dụng mọi tiêu chí lọc, không tự nới | S2-01 |
| 1.3 | Chế độ Khám phá | Ngoài phạm vi |
| 1.4 | Quay lại giữ danh sách và tiêu chí | S2-01, 02, 03, 04 |
| 1.5 | Công thức có tên, thời gian, nguyên liệu kèm định lượng/đơn vị, bước có thứ tự; thiếu thì báo rõ | S2-04 |
| 4.1 | Tối thiểu 1 nguyên liệu hợp lệ | S2-02 |
| 4.2 | Đối sánh theo tỷ lệ có xét nguyên liệu chính/phụ, hiện độ khớp và phần thiếu | S2-02 |
| 4.3 | Dị ứng/kiêng kỵ | Ngoài phạm vi |
| 4.4 | Công thức thiếu thành phần phải đánh dấu, không khẳng định đủ nguyên liệu | S2-02, S2-04 |

---

## 3. Acceptance Criteria theo story

### S2-01 — Tab Gợi ý món `[P0]`

Người dùng vào `/goi-y`, tab **Gợi ý món**, nhận từng món một và có thể thu hẹp bằng chip hoàn cảnh. Tab này **chỉ có chip hoàn cảnh** (và chip vùng miền ở mức P1). Lọc theo khẩu vị và thời gian chế biến thuộc S2-03.

| ID | Given | When | Then |
|---|---|---|---|
| S2-01.1 | Khách (chưa đăng nhập) mở `/goi-y`, không nhập nguyên liệu hay sở thích | Trang tải xong | Hiện **một** thẻ món gồm ảnh, tên, mô tả ngắn, thời gian nấu và ba nút **Nấu món này / Bỏ qua / Gợi ý khác**. Không yêu cầu đăng nhập hay nhập gì thêm |
| S2-01.2 | Trong phiên này đã hiện món A và B | Bấm **Gợi ý khác** hoặc **Bỏ qua** | Món mới **không** thuộc A, B (frontend gửi danh sách đã xem qua `exclude`). Món đã hiện không quay lại trong cùng phiên (QĐ 1.1) |
| S2-01.3 | Đã xem nhiều thẻ | Bấm xem lại thẻ trước | Hiện lại thẻ của lượt trước (QĐ 1.1). Thao tác này không làm món nào bị tính là "lặp" |
| S2-01.4 | Có 5 chip hoàn cảnh: **Trời mưa** (`TROI_MUA`), **Lười nấu** (`LUOI_NAU`), **Cuối tháng** (`CUOI_THANG`), **Nấu cho 4 người** (`NAU_CHO_4`), **Ăn nhẹ** (`AN_NHE`); mã là mã tag của DB10 | Chọn một hoặc nhiều chip | Chỉ hiện món gắn **tất cả** tag của các chip đang chọn (điều kiện AND). Bỏ chip thì lọc lại theo các chip còn lại. Không có chip khẩu vị hay thời gian ở tab này |
| S2-01.5 | Đã chọn chip, không còn món nào thỏa chip mà chưa xuất hiện | Bấm **Gợi ý khác** | API trả 200 + `[]`. Giao diện hiện trạng thái "hết món phù hợp". **Không tự bỏ hay nới chip** (QĐ 1.2); người dùng tự quyết định đổi chip |
| S2-01.6 | Khách ở tab Gợi ý món, có hoặc không có chip đang chọn | Bấm nút ngẫu nhiên **"Hôm nay ăn gì?"** | Nhận một món ngẫu nhiên có thật trong dữ liệu hệ thống, **thỏa các chip đang chọn** và **không thuộc danh sách đã xem**. Hết món thì xử lý như S2-01.5. Nút dùng được khi chưa đăng nhập |
| S2-01.7 | Đang xem thẻ món X với một số chip đã chọn | Bấm **Nấu món này** | Chuyển sang `/dishes/X`. Bấm quay lại thì tab, chip, thẻ hiện tại và danh sách đã xem được giữ nguyên (QĐ 1.4) |
| S2-01.8 | Đang ở tab Gợi ý món | Chuyển sang tab Theo nguyên liệu rồi quay lại | Trạng thái tab Gợi ý món không mất |
| S2-01.9 | Gọi API chậm | Chờ phản hồi | Hiện trạng thái đang tải, các nút không gửi trùng yêu cầu |
| S2-01.10 | API lỗi mạng hoặc 500 | Hiện thông báo lỗi | Có nút **Thử lại**. Món của lần gọi lỗi không bị tính là đã xem. Thử lại thành công thì tiếp tục bình thường |
| S2-01.11 | Tham số gợi ý không hợp lệ (mã chip lạ, `limit` ngoài khoảng, `exclude` không phải danh sách số) | Gọi API trực tiếp | 400, không trả dữ liệu |
| S2-01.12 `[P1]` | Có chip vùng miền **Bắc/Trung/Nam** (`BAC`/`TRUNG`/`NAM`) | Chọn chip vùng miền | Chỉ hiện món thuộc vùng đó, kết hợp AND với chip hoàn cảnh |

### S2-02 — Tab Theo nguyên liệu `[P0]`

Người dùng nhập nguyên liệu đang có và xem món nấu được, kèm mức khớp.

| ID | Given | When | Then |
|---|---|---|---|
| S2-02.1 | Tab Theo nguyên liệu, chưa chọn nguyên liệu nào | Bấm tìm món | Không gửi tìm kiếm; nhắc cần ít nhất **1 nguyên liệu hợp lệ** (QĐ 4.1). Gọi thẳng API đối sánh không có nguyên liệu → 400 |
| S2-02.2 | Ô nhập nguyên liệu | Gõ `ca chua`, `Cà Chua` hoặc `cà chua` | Cả ba cho gợi ý "cà chua": không phân biệt hoa/thường, có dấu hay không dấu |
| S2-02.3 | Ô nhập nguyên liệu | Gõ từ đồng nghĩa, ví dụ `hành xanh` | Gợi ý "hành lá" (từ bảng đồng nghĩa) |
| S2-02.4 | Ô nhập nguyên liệu | Gõ chuỗi không khớp nguyên liệu nào | Hiện "không tìm thấy" (API trả 200 + `[]`), không báo lỗi |
| S2-02.5 | Gợi ý đang hiện | Chọn một gợi ý | Thành chip nguyên liệu; chọn lại nguyên liệu đã có không tạo chip trùng; xóa được từng chip. **Chỉ nguyên liệu có trong từ điển mới thành chip** |
| S2-02.6 | Người dùng gõ một chữ không chọn gợi ý nào | Bấm Enter | **Không thêm gì** (không tạo chip, không gửi tìm kiếm), vì chỉ nguyên liệu hợp lệ mới được tính (QĐ 4.1) |
| S2-02.7 | Công tắc **Tủ bếp cơ bản** (muối, đường, dầu ăn, nước mắm, tiêu) | Mở tab lần đầu | Công tắc **bật mặc định**: các nguyên liệu cơ bản được tính là đã có khi đối sánh |
| S2-02.8 | Như trên | Tắt công tắc | Các nguyên liệu cơ bản được tính như mọi nguyên liệu khác: thiếu thì ghi vào danh sách thiếu |
| S2-02.9 | Đã có ít nhất 1 nguyên liệu | Tìm món | Kết quả chia thành **4 nhóm** theo thứ tự: **Nấu ngay / Thiếu 1–2 thứ / Cần đi chợ / Chưa đủ dữ liệu để kết luận** (QĐ 4.4). API trả `readiness` 3 giá trị (`READY`, `MISSING_1_2`, `NEED_SHOPPING`) cùng cờ `is_incomplete`; nhóm thứ tư do giao diện suy ra từ cờ này. Quy tắc xếp nhóm (món không `is_incomplete`): không thiếu gì → Nấu ngay; tổng thiếu 1 hoặc 2 → Thiếu 1–2 thứ; còn lại → Cần đi chợ. Ngưỡng này **`[tạm thời]`, chốt theo RPC DB12** |
| S2-02.10 | Một món có `is_incomplete = true` | Xem kết quả | Món vào nhóm **Chưa đủ dữ liệu để kết luận** bất kể `readiness`, và không được trình bày như đã đủ nguyên liệu (QĐ 4.4). Nhóm không có món nào thì không hiển thị |
| S2-02.11 | Có kết quả | Duyệt từng nhóm | Thứ tự món trong mỗi nhóm đúng như API trả về (API xếp theo % khớp giảm dần); frontend không sắp xếp lại và không tính lại % |
| S2-02.12 | Có kết quả | Xem một món | Hiện thanh tiến độ và **"X% khớp"** lấy từ `match_ratio` (có trọng số theo vai trò chính/phụ, QĐ 4.2). Cạnh đó hiện dòng **"Có a/b nguyên liệu"** là số đếm, cùng chip nguyên liệu thiếu, ví dụ "Có 5/7 nguyên liệu, thiếu: hành lá, nước mắm". Hai con số có thể không tương ứng nhau (ví dụ 5/7 nhưng không phải 71%); đó là thiết kế |
| S2-02.13 | Không món nào phù hợp | Tìm món | API trả 200 + `[]`; giao diện hiện thông báo rỗng, không phải lỗi |
| S2-02.14 | Có kết quả | Chọn một món | Chuyển sang `/dishes/:id` rồi tới công thức. Quay lại thì giữ nguyên chip nguyên liệu, công tắc tủ bếp và kết quả (QĐ 1.4) |
| S2-02.15 | Khách chưa đăng nhập | Dùng toàn bộ tab | Dùng được, không bị chặn |
| S2-02.16 | Đang tải hoặc API lỗi | Chờ phản hồi | Có trạng thái đang tải; lỗi thì có thông báo và nút **Thử lại** |
| S2-02.17 | Bộ 3–5 ca mẫu tính tay (dữ liệu mẫu chốt cùng TV3) | Chạy đối sánh | Nhóm, `match_ratio`, "có/tổng", danh sách thiếu và thứ tự khớp với kết quả tính tay |
| S2-02.18 `[P1]` | Đã có nguyên liệu | Xem gợi ý "mua thêm" | Hiện nguyên liệu mở khóa nhiều món nhất kèm số món. Có thể ghim nguyên liệu và sao chép danh sách đi chợ (FE11). Không có gợi ý thì API 200 + `[]` và giao diện ẩn mục này |

### S2-03 — Tìm và lọc món `[P0]`

Người dùng vào `/search` để tìm món theo tên và lọc. Đây là nơi duy nhất có bộ lọc khẩu vị và thời gian chế biến.

| ID | Given | When | Then |
|---|---|---|---|
| S2-03.1 | Có món "Phở bò" | Tìm `pho bo`, `PHỞ BÒ` hoặc `Pho` | Đều thấy "Phở bò" (không phân biệt hoa/thường, có dấu/không dấu) |
| S2-03.2 | Trang tìm kiếm | Lọc theo loại món, **khẩu vị** (`MAN`, `CAY`, `NGOT`, `CHUA`, `THANH`) và **thời gian chế biến** | Chỉ hiện món thỏa các bộ lọc đã chọn, kết hợp AND với từ khóa tên |
| S2-03.3 | Từ khóa hoặc bộ lọc không có món nào | Tìm | API 200 + `[]` với `total` = 0; giao diện hiện thông báo "không tìm thấy món phù hợp" |
| S2-03.4 | Nhiều món hơn một trang | Chuyển trang | Phân trang đúng quy ước mục 1.3 của `docs/api.md`: không trùng, không sót món với dữ liệu cố định; `meta.total` đúng |
| S2-03.5 | `page`/`limit` sai (≤0, không phải số, vượt giới hạn) hoặc mã bộ lọc lạ | Gọi API trực tiếp | 400 |
| S2-03.6 | Đã nhập từ khóa, bộ lọc và sang trang 2, rồi mở chi tiết một món | Bấm quay lại | Từ khóa, bộ lọc và số trang giữ nguyên (QĐ 1.4) |
| S2-03.7 | Khách chưa đăng nhập | Tìm món | Dùng được |
| S2-03.8 | Đang tải hoặc API lỗi | Chờ phản hồi | Có đang tải; lỗi thì có thông báo và **Thử lại** |

### S2-04 — Chi tiết món → Tự nấu → Công thức `[P0]`

| ID | Given | When | Then |
|---|---|---|---|
| S2-04.1 | Món tồn tại | Mở `/dishes/:id` | Hiện tên, ảnh, mô tả, thời gian nấu, nút **Tự nấu**, mục "Quán ăn: Sắp có" (chưa có chức năng), và danh sách công thức (tên, khẩu phần, thời gian) |
| S2-04.2 | Món chưa có công thức nào | Mở chi tiết | Hiện thông báo rõ "chưa có công thức", không để vùng trống khó hiểu (QĐ 1.5) |
| S2-04.3 | Món có công thức, kể cả chỉ có **một** công thức | Bấm **Tự nấu** | Hiện danh sách công thức của món; người dùng chọn một công thức để mở `/recipes/:id`. Không tự vào thẳng công thức khi chỉ có một |
| S2-04.4 | Công thức tồn tại | Mở `/recipes/:id` | Hiện tên, khẩu phần, thời gian chuẩn bị, **nguyên liệu kèm định lượng và đơn vị**, và **các bước đánh số theo thứ tự** (QĐ 1.5) |
| S2-04.5 | Nguyên liệu không có định lượng cố định (`quantity` rỗng) | Xem danh sách nguyên liệu | Hiện "tùy khẩu vị", không hiện 0 hay để trống |
| S2-04.6 | Công thức thiếu thành phần (đánh dấu chưa đầy đủ, hoặc thiếu thời gian/khẩu phần) | Xem công thức hoặc danh sách công thức | Báo rõ phần nào thiếu ("chưa có thông tin") và gắn nhãn "chưa đầy đủ" nếu có; không khẳng định đủ nguyên liệu và không bịa giá trị (QĐ 1.5, QĐ 4.4) |
| S2-04.7 | ID món hoặc công thức không tồn tại, hoặc món không còn `ACTIVE` | Mở trang, hoặc gọi API | API 404; giao diện hiện trang "không tìm thấy" có đường quay về |
| S2-04.8 | ID sai định dạng (chữ, số âm) | Gọi API | 400 |
| S2-04.9 | Khách chưa đăng nhập | Xem chi tiết và công thức | Dùng được |
| S2-04.10 | Đến công thức từ gợi ý, đối sánh hoặc tìm kiếm | Bấm quay lại | Về đúng màn hình trước với danh sách và tiêu chí được giữ (QĐ 1.4) |
| S2-04.11 | Đang tải hoặc API lỗi | Chờ phản hồi | Có đang tải; lỗi thì có thông báo và **Thử lại** |

---

## 4. Ngoài phạm vi Sprint 2 (dời sang Sprint 3)

- Cộng đồng và quản trị (duyệt, ẩn bài, tương tác, phân quyền admin) ngoài những gì Sprint 1 đã có.
- Cảnh báo dị ứng và kiêng kỵ (QĐ 4.3).
- Chế độ Khám phá món ngoài sở thích (QĐ 1.3).
- Nếu bị cắt do thiếu thời gian: BE12 (`GET /api/ingredients/suggest-next`) cùng FE11 (S2-02.18), và chip vùng miền (S2-01.12).
- Chức năng "Quán ăn" (mới chỉ hiện nhãn "Sắp có").

---

## 5. Definition of Done Sprint 2

Theo mẫu DoD Sprint 1. Sprint 2 chỉ được coi là hoàn thành khi **tất cả** các điều kiện sau đúng:

- **(a) Luồng chạy trên môi trường chung:** hai luồng S2-01 (Gợi ý món) và S2-02 (Theo nguyên liệu), cùng luồng tìm món → chi tiết → công thức, chạy được trên môi trường chung (staging nếu có, không thì local) với FE nối backend thật (`VITE_USE_MOCK_API=false`). Phần nào còn mock phải ghi rõ trong `docs/sprint2-demo.md`.
- **(b) Story đạt đủ AC:** mỗi story S2-01…S2-04 đạt mọi AC `[P0]`. AC `[P1]` chưa làm thì ghi rõ là dời Sprint 3.
- **(c) Review và CI:** mỗi PR có ít nhất 1 reviewer duyệt (đề xuất TV3 duyệt backend) và CI xanh. CI xanh không thay cho các điều kiện còn lại.
- **(d) Bug:** không còn bug P0 mở.
- **(e) Dữ liệu:** dataset **tối thiểu 30 món**, trong đó **tối thiểu 20 món đủ dữ liệu**, có tag, vùng miền và vai trò nguyên liệu (chính/phụ), đã nạp trên Supabase.
- **(f) Tài liệu và báo cáo:** có `docs/api.md` v2.0, `docs/sprint2-demo.md` và test report QA06.

Mỗi task Jira gắn với một PR riêng vào `main`. Không có `.env` hay secret trong commit; lỗi 500 không lộ chi tiết nội bộ.

**Hạn Sprint 2:** chưa có ngày, điền khi nhóm chốt.

---

## 6. Quyết định đã chốt và việc còn mở

**Đã chốt:**

1. Kết quả đối sánh hiển thị 4 nhóm; nhóm thứ tư suy ra từ `is_incomplete` (S2-02.9, S2-02.10).
2. Tab Gợi ý chỉ có chip hoàn cảnh; khẩu vị và thời gian chỉ ở S2-03 (S2-01.4, S2-03.2).
3. Nút "Hôm nay ăn gì?" áp dụng chip đang chọn và `exclude` (S2-01.6).
4. "X% khớp" là `match_ratio` có trọng số; "Có a/b nguyên liệu" là số đếm (S2-02.12).
5. Chỉ chọn nguyên liệu trong từ điển; Enter không chọn gợi ý thì không thêm gì (S2-02.5, S2-02.6).
6. Tủ bếp cơ bản mặc định bật (S2-02.7).
7. Món một công thức vẫn qua danh sách công thức (S2-04.3).
8. Nội dung các QĐ đã đối chiếu `report.md` (mục 2).
9. Tên nhóm thứ tư là "Chưa đủ dữ liệu để kết luận", theo `groupMatchResults.js` của Hương.

**Còn mở:**

- **Ngưỡng nhóm mức khớp** `[tạm thời]`: chốt theo RPC DB12 của TV3 (S2-02.9). Nếu RPC khác quy tắc trên thì sửa AC và contract theo RPC.
- **Hạn Sprint 2:** chưa có ngày.
- **Dataset ≥30 món** (DoD e) phụ thuộc DB14 và DA04; chưa có bằng chứng đã nạp.

---

## 7. Ánh xạ story → task Jira

| KAN | Mã | Người | Nội dung | Story |
|---|---|---|---|---|
| KAN-232 | PO02 | TV1 | Sprint Planning, AC Sprint 2 | Chung |
| KAN-233 | BE07 | TV1 | API contract Sprint 2 | Chung |
| KAN-234 | BE11 | TV1 | `GET /api/ingredients?search=` | S2-02 |
| KAN-235 | BE08 | TV1 | `GET /api/suggestions` | S2-01 |
| KAN-236 | BE12 (P1) | TV1 | `GET /api/ingredients/suggest-next` | S2-02 (P1) |
| KAN-237 | INT02 | TV1 | Tích hợp và demo | Chung |
| KAN-238 | FE07 | Hương | `/goi-y` hai tab, route khung | S2-01, S2-02, S2-03, S2-04 |
| KAN-239 | FE08 | Hương | Tab Gợi ý món | S2-01 |
| KAN-240 | FE09 | Hương | Tab Theo nguyên liệu | S2-02 |
| KAN-241 | SM02 | Hương | Daily / Review / Retro | Chung |
| KAN-242 | DB10 | Bảo | Tag, vùng miền, cờ gia vị cơ bản, role | S2-01, S2-02, S2-03 |
| KAN-243 | DB11 | Bảo | Từ đồng nghĩa, tên không dấu | S2-02, S2-03 |
| KAN-244 | DB12 | Bảo | RPC đối sánh | S2-02 |
| KAN-245 | DB14 | Bảo | Nạp dataset bổ sung | S2-01, S2-02, S2-03 |
| KAN-246 | FE10 | Bảo | `/search`, `/dishes/:id`, `/recipes/:id` | S2-03, S2-04 |
| KAN-247 | DA04 | Châu | ≥30 món + tag, vùng miền, khẩu vị, role, gia vị cơ bản | S2-01, S2-02 |
| KAN-248 | BE09 | Châu | Mở rộng `/api/dishes`, `/api/dishes/:id`, `/api/recipes/:id` | S2-03, S2-04 |
| KAN-249 | BE10 | Châu | `GET /api/dishes/match` | S2-02 |
| KAN-250 | QA04 | Hiền | Test case từ AC | Tất cả |
| KAN-251 | DO04 (P1) | Hiền | CI + staging | Chung |
| KAN-252 | QA05 | Hiền | Test API + UI hai tab, đối chiếu 3–5 ca | S2-01, S2-02, S2-04 |
| KAN-253 | QA06 | Hiền | Hồi quy + report | Tất cả |
| KAN-254 | FE11 (P1) | Hiền | Mua thêm, ghim, sao chép danh sách đi chợ | S2-02 (P1) |

Đường găng: DB12 → BE10 → FE09 → INT02.
