# QA04 — Test plan và test cases Sprint 2

Nguồn PO02/BE07 5aae4f6, FE09 786605d, DB12 23b78ef và SE_SP2.md. PO review: CHỜ XÁC NHẬN. Bảng giữ nguyên Given/When/Then từ từng AC; không tự sửa tiêu chí của PO.

Phạm vi P0 S2-01…04; vùng miền P1 báo riêng; FE11/BE12 và S2-02.18 dời Sprint 3. Entry: FE/BE đã tích hợp, ghi SHA FE/BE/DB và URL, cả VITE_USE_MOCK=false và VITE_USE_MOCK_API=false; dataset QA có ID chuẩn, món ACTIVE/HIDDEN, 0/1/nhiều công thức, công thức thiếu dữ liệu. Không nạp fixture lên DB chung.

Trình tự: smoke API bằng collection QA05 → 5 ca tính tay → UI hai tab → tìm/chi tiết/công thức → hồi quy Sprint 1. Chromium và Firefox desktop, thêm viewport 390×844. DevTools throttle kiểm tra loading, offline/giả lập 500 tại local QA để kiểm tra retry, không phá quyền DB dùng chung. Mỗi case ghi actual, status, bằng chứng, bug, runner, môi trường và SHA trong bản sao bảng; chưa chạy giữ NOT RUN.

Exit: mọi P0 pass, không P0 mở, lỗi còn lại có owner/hạn xử lý, PO xác nhận. Báo PASS/FAIL/BLOCKED/NOT RUN/DEFERRED riêng. Unit/mock pass không thay live pass. QA06 nhận kết quả sau INT02.

| Case ID | AC | Điều kiện | Bước thực hiện | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| QA04-S2-01.1 | S2-01.1 | Khách (chưa đăng nhập) mở `/goi-y`, không nhập nguyên liệu hay sở thích | Trang tải xong | Hiện **một** thẻ món gồm ảnh, tên, mô tả ngắn, thời gian nấu và ba nút **Nấu món này / Bỏ qua / Gợi ý khác**. Không yêu cầu đăng nhập hay nhập gì thêm | NOT RUN |
| QA04-S2-01.2 | S2-01.2 | Trong phiên này đã hiện món A và B | Bấm **Gợi ý khác** hoặc **Bỏ qua** | Món mới **không** thuộc A, B (frontend gửi danh sách đã xem qua `exclude`). Món đã hiện không quay lại trong cùng phiên (QĐ 1.1) | NOT RUN |
| QA04-S2-01.3 | S2-01.3 | Đã xem nhiều thẻ | Bấm xem lại thẻ trước | Hiện lại thẻ của lượt trước (QĐ 1.1). Thao tác này không làm món nào bị tính là "lặp" | NOT RUN |
| QA04-S2-01.4 | S2-01.4 | Có 5 chip hoàn cảnh: **Trời mưa** (`TROI_MUA`), **Lười nấu** (`LUOI_NAU`), **Cuối tháng** (`CUOI_THANG`), **Nấu cho 4 người** (`NAU_CHO_4`), **Ăn nhẹ** (`AN_NHE`); mã là mã tag của DB10 | Chọn một hoặc nhiều chip | Chỉ hiện món gắn **tất cả** tag của các chip đang chọn (điều kiện AND). Bỏ chip thì lọc lại theo các chip còn lại. Không có chip khẩu vị hay thời gian ở tab này | NOT RUN |
| QA04-S2-01.5 | S2-01.5 | Đã chọn chip, không còn món nào thỏa chip mà chưa xuất hiện | Bấm **Gợi ý khác** | API trả 200 + `[]`. Giao diện hiện trạng thái "hết món phù hợp". **Không tự bỏ hay nới chip** (QĐ 1.2); người dùng tự quyết định đổi chip | NOT RUN |
| QA04-S2-01.6 | S2-01.6 | Khách ở tab Gợi ý món, có hoặc không có chip đang chọn | Bấm nút ngẫu nhiên **"Hôm nay ăn gì?"** | Nhận một món ngẫu nhiên có thật trong dữ liệu hệ thống, **thỏa các chip đang chọn** và **không thuộc danh sách đã xem**. Hết món thì xử lý như S2-01.5. Nút dùng được khi chưa đăng nhập | NOT RUN |
| QA04-S2-01.7 | S2-01.7 | Đang xem thẻ món X với một số chip đã chọn | Bấm **Nấu món này** | Chuyển sang `/dishes/X`. Bấm quay lại thì tab, chip, thẻ hiện tại và danh sách đã xem được giữ nguyên (QĐ 1.4) | NOT RUN |
| QA04-S2-01.8 | S2-01.8 | Đang ở tab Gợi ý món | Chuyển sang tab Theo nguyên liệu rồi quay lại | Trạng thái tab Gợi ý món không mất | NOT RUN |
| QA04-S2-01.9 | S2-01.9 | Gọi API chậm | Chờ phản hồi | Hiện trạng thái đang tải, các nút không gửi trùng yêu cầu | NOT RUN |
| QA04-S2-01.10 | S2-01.10 | API lỗi mạng hoặc 500 | Hiện thông báo lỗi | Có nút **Thử lại**. Món của lần gọi lỗi không bị tính là đã xem. Thử lại thành công thì tiếp tục bình thường | NOT RUN |
| QA04-S2-01.11 | S2-01.11 | Tham số gợi ý không hợp lệ (mã chip lạ, `limit` ngoài khoảng, `exclude` không phải danh sách số) | Gọi API trực tiếp | 400, không trả dữ liệu | NOT RUN |
| QA04-S2-01.12 | S2-01.12 `[P1]` | Có chip vùng miền **Bắc/Trung/Nam** (`BAC`/`TRUNG`/`NAM`) | Chọn chip vùng miền | Chỉ hiện món thuộc vùng đó, kết hợp AND với chip hoàn cảnh | NOT RUN |
| QA04-S2-02.1 | S2-02.1 | Tab Theo nguyên liệu, chưa chọn nguyên liệu nào | Bấm tìm món | Không gửi tìm kiếm; nhắc cần ít nhất **1 nguyên liệu hợp lệ** (QĐ 4.1). Gọi thẳng API đối sánh không có nguyên liệu → 400 | NOT RUN |
| QA04-S2-02.2 | S2-02.2 | Ô nhập nguyên liệu | Gõ `ca chua`, `Cà Chua` hoặc `cà chua` | Cả ba cho gợi ý "cà chua": không phân biệt hoa/thường, có dấu hay không dấu | NOT RUN |
| QA04-S2-02.3 | S2-02.3 | Ô nhập nguyên liệu | Gõ từ đồng nghĩa, ví dụ `hành xanh` | Gợi ý "hành lá" (từ bảng đồng nghĩa) | NOT RUN |
| QA04-S2-02.4 | S2-02.4 | Ô nhập nguyên liệu | Gõ chuỗi không khớp nguyên liệu nào | Hiện "không tìm thấy" (API trả 200 + `[]`), không báo lỗi | NOT RUN |
| QA04-S2-02.5 | S2-02.5 | Gợi ý đang hiện | Chọn một gợi ý | Thành chip nguyên liệu; chọn lại nguyên liệu đã có không tạo chip trùng; xóa được từng chip. **Chỉ nguyên liệu có trong từ điển mới thành chip** | NOT RUN |
| QA04-S2-02.6 | S2-02.6 | Người dùng gõ một chữ không chọn gợi ý nào | Bấm Enter | **Không thêm gì** (không tạo chip, không gửi tìm kiếm), vì chỉ nguyên liệu hợp lệ mới được tính (QĐ 4.1) | NOT RUN |
| QA04-S2-02.7 | S2-02.7 | Công tắc **Tủ bếp cơ bản** (muối, đường, dầu ăn, nước mắm, tiêu) | Mở tab lần đầu | Công tắc **bật mặc định**: các nguyên liệu cơ bản được tính là đã có khi đối sánh | NOT RUN |
| QA04-S2-02.8 | S2-02.8 | Như trên | Tắt công tắc | Các nguyên liệu cơ bản được tính như mọi nguyên liệu khác: thiếu thì ghi vào danh sách thiếu | NOT RUN |
| QA04-S2-02.9 | S2-02.9 | Đã có ít nhất 1 nguyên liệu | Tìm món | Kết quả chia thành **4 nhóm** theo thứ tự: **Nấu ngay / Thiếu 1–2 thứ / Cần đi chợ / Chưa đủ dữ liệu để kết luận** (QĐ 4.4). API trả `readiness` 3 giá trị (`READY`, `MISSING_1_2`, `NEED_SHOPPING`) cùng cờ `is_incomplete`; nhóm thứ tư do giao diện suy ra từ cờ này. Quy tắc xếp nhóm (món không `is_incomplete`): không thiếu gì → Nấu ngay; tổng thiếu 1 hoặc 2 → Thiếu 1–2 thứ; còn lại → Cần đi chợ. Ngưỡng này **`[tạm thời]`, chốt theo RPC DB12** | NOT RUN |
| QA04-S2-02.10 | S2-02.10 | Một món có `is_incomplete = true` | Xem kết quả | Món vào nhóm **Chưa đủ dữ liệu để kết luận** bất kể `readiness`, và không được trình bày như đã đủ nguyên liệu (QĐ 4.4). Nhóm không có món nào thì không hiển thị | NOT RUN |
| QA04-S2-02.11 | S2-02.11 | Có kết quả | Duyệt từng nhóm | Thứ tự món trong mỗi nhóm đúng như API trả về (API xếp theo % khớp giảm dần); frontend không sắp xếp lại và không tính lại % | NOT RUN |
| QA04-S2-02.12 | S2-02.12 | Có kết quả | Xem một món | Hiện thanh tiến độ và **"X% khớp"** lấy từ `match_ratio` (có trọng số theo vai trò chính/phụ, QĐ 4.2). Cạnh đó hiện dòng **"Có a/b nguyên liệu"** là số đếm, cùng chip nguyên liệu thiếu, ví dụ "Có 5/7 nguyên liệu, thiếu: hành lá, nước mắm". Hai con số có thể không tương ứng nhau (ví dụ 5/7 nhưng không phải 71%); đó là thiết kế | NOT RUN |
| QA04-S2-02.13 | S2-02.13 | Không món nào phù hợp | Tìm món | API trả 200 + `[]`; giao diện hiện thông báo rỗng, không phải lỗi | NOT RUN |
| QA04-S2-02.14 | S2-02.14 | Có kết quả | Chọn một món | Chuyển sang `/dishes/:id` rồi tới công thức. Quay lại thì giữ nguyên chip nguyên liệu, công tắc tủ bếp và kết quả (QĐ 1.4) | NOT RUN |
| QA04-S2-02.15 | S2-02.15 | Khách chưa đăng nhập | Dùng toàn bộ tab | Dùng được, không bị chặn | NOT RUN |
| QA04-S2-02.16 | S2-02.16 | Đang tải hoặc API lỗi | Chờ phản hồi | Có trạng thái đang tải; lỗi thì có thông báo và nút **Thử lại** | NOT RUN |
| QA04-S2-02.17 | S2-02.17 | Bộ 3–5 ca mẫu tính tay (dữ liệu mẫu chốt cùng TV3) | Chạy đối sánh | Nhóm, `match_ratio`, "có/tổng", danh sách thiếu và thứ tự khớp với kết quả tính tay | NOT RUN |
| QA04-S2-02.18 | S2-02.18 `[Sprint 3]` | Đã có nguyên liệu | Xem gợi ý "mua thêm" | Hiện nguyên liệu mở khóa nhiều món nhất kèm số món. Có thể ghim nguyên liệu và sao chép danh sách đi chợ (FE11). Không có gợi ý thì API 200 + `[]` và giao diện ẩn mục này | DEFERRED |
| QA04-S2-03.1 | S2-03.1 | Có món "Phở bò" | Tìm `pho bo`, `PHỞ BÒ` hoặc `Pho` | Đều thấy "Phở bò" (không phân biệt hoa/thường, có dấu/không dấu) | NOT RUN |
| QA04-S2-03.2 | S2-03.2 | Trang tìm kiếm | Lọc theo loại món, **khẩu vị** (`MAN`, `CAY`, `NGOT`, `CHUA`, `THANH`) và **thời gian chế biến** | Chỉ hiện món thỏa các bộ lọc đã chọn, kết hợp AND với từ khóa tên | NOT RUN |
| QA04-S2-03.3 | S2-03.3 | Từ khóa hoặc bộ lọc không có món nào | Tìm | API 200 + `[]` với `total` = 0; giao diện hiện thông báo "không tìm thấy món phù hợp" | NOT RUN |
| QA04-S2-03.4 | S2-03.4 | Nhiều món hơn một trang | Chuyển trang | Phân trang đúng quy ước mục 1.3 của `docs/api.md`: không trùng, không sót món với dữ liệu cố định; `meta.total` đúng | NOT RUN |
| QA04-S2-03.5 | S2-03.5 | `page`/`limit` sai (≤0, không phải số, vượt giới hạn) hoặc mã bộ lọc lạ | Gọi API trực tiếp | 400 | NOT RUN |
| QA04-S2-03.6 | S2-03.6 | Đã nhập từ khóa, bộ lọc và sang trang 2, rồi mở chi tiết một món | Bấm quay lại | Từ khóa, bộ lọc và số trang giữ nguyên (QĐ 1.4) | NOT RUN |
| QA04-S2-03.7 | S2-03.7 | Khách chưa đăng nhập | Tìm món | Dùng được | NOT RUN |
| QA04-S2-03.8 | S2-03.8 | Đang tải hoặc API lỗi | Chờ phản hồi | Có đang tải; lỗi thì có thông báo và **Thử lại** | NOT RUN |
| QA04-S2-04.1 | S2-04.1 | Món tồn tại | Mở `/dishes/:id` | Hiện tên, ảnh, mô tả, thời gian nấu, nút **Tự nấu**, mục "Quán ăn: Sắp có" (chưa có chức năng), và danh sách công thức (tên, khẩu phần, thời gian) | NOT RUN |
| QA04-S2-04.2 | S2-04.2 | Món chưa có công thức nào | Mở chi tiết | Hiện thông báo rõ "chưa có công thức", không để vùng trống khó hiểu (QĐ 1.5) | NOT RUN |
| QA04-S2-04.3 | S2-04.3 | Món có công thức, kể cả chỉ có **một** công thức | Bấm **Tự nấu** | Hiện danh sách công thức của món; người dùng chọn một công thức để mở `/recipes/:id`. Không tự vào thẳng công thức khi chỉ có một | NOT RUN |
| QA04-S2-04.4 | S2-04.4 | Công thức tồn tại | Mở `/recipes/:id` | Hiện tên, khẩu phần, thời gian chuẩn bị, **nguyên liệu kèm định lượng và đơn vị**, và **các bước đánh số theo thứ tự** (QĐ 1.5) | NOT RUN |
| QA04-S2-04.5 | S2-04.5 | Nguyên liệu không có định lượng cố định (`quantity` rỗng) | Xem danh sách nguyên liệu | Hiện "tùy khẩu vị", không hiện 0 hay để trống | NOT RUN |
| QA04-S2-04.6 | S2-04.6 | Công thức thiếu thành phần (đánh dấu chưa đầy đủ, hoặc thiếu thời gian/khẩu phần) | Xem công thức hoặc danh sách công thức | Báo rõ phần nào thiếu ("chưa có thông tin") và gắn nhãn "chưa đầy đủ" nếu có; không khẳng định đủ nguyên liệu và không bịa giá trị (QĐ 1.5, QĐ 4.4) | NOT RUN |
| QA04-S2-04.7 | S2-04.7 | ID món hoặc công thức không tồn tại, hoặc món không còn `ACTIVE` | Mở trang, hoặc gọi API | API 404; giao diện hiện trang "không tìm thấy" có đường quay về | NOT RUN |
| QA04-S2-04.8 | S2-04.8 | ID sai định dạng (chữ, số âm) | Gọi API | 400 | NOT RUN |
| QA04-S2-04.9 | S2-04.9 | Khách chưa đăng nhập | Xem chi tiết và công thức | Dùng được | NOT RUN |
| QA04-S2-04.10 | S2-04.10 | Đến công thức từ gợi ý, đối sánh hoặc tìm kiếm | Bấm quay lại | Về đúng màn hình trước với danh sách và tiêu chí được giữ (QĐ 1.4) | NOT RUN |
| QA04-S2-04.11 | S2-04.11 | Đang tải hoặc API lỗi | Chờ phản hồi | Có đang tải; lỗi thì có thông báo và **Thử lại** | NOT RUN |

## Bổ sung

| Case ID | Điều kiện | Bước | Mong đợi | Trạng thái |
|---|---|---|---|---|
| QA04-MOBILE | 390×844 | Dùng hai tab, chi tiết, công thức, back | Không tràn ngang, thao tác được, giữ trạng thái | NOT RUN |
| QA04-HIDDEN | TV3 cung cấp ID HIDDEN | Tìm và gọi chi tiết trực tiếp | Không xuất hiện, chi tiết 404 | NOT RUN |
| QA04-500 | Local QA giả lập lỗi | Gây 500 và retry | Lỗi thân thiện, không SQL/stack/token; retry được | NOT RUN |
| QA04-S1 | Bản tích hợp giữ chức năng main | Test /api/me, login, feed/detail/create post | Không mất API/test đã merge | NOT RUN |

## Năm ca tính tay

Fixture riêng theo DB12: Trứng PRIMARY=2, Cà chua PRIMARY=2, Muối SECONDARY=1, Dầu SECONDARY=1; tổng weight=6, tổng loại=4; COMPLETE, có thời gian và bước nấu. Muối/dầu có cờ basic pantry. API ratio=round(100×matched_weight/6,2)/100, không phải số có/tổng.

| Có | Pantry | Ratio | Có/tổng | Thiếu | HTTP readiness |
|---|---|---|---|---|---|
| Trứng | false | 0.3333 | 1/4 | Cà chua, muối, dầu | NEED_SHOPPING |
| Trứng, cà chua | false | 0.6667 | 2/4 | Muối, dầu | MISSING_1_2 |
| Trứng, cà chua, muối | false | 0.8333 | 3/4 | Dầu | MISSING_1_2 |
| Cả bốn | false | 1 | 4/4 | Không | READY |
| Trứng, cà chua | true | 1 | 4/4 | Không | READY |

TV3 xác nhận ID/role/cờ/COMPLETE trước chạy. Không sửa expected theo response. Tập rỗng ở HTTP phải 400 dù RPC cho phép []; INCOMPLETE dù 100% phải thuộc nhóm 4. Nếu không có fixture chuẩn thì BLOCKED, không tuyên bố đã đối chiếu live.
