# QA06 — Báo cáo hồi quy Sprint 2, 24/11/2026

## Sau sửa tag ID5 — đề nghị review ngày 27/11/2026

PR36 `4549d4e` giữ nguyên code; người dùng đã sửa DB `nau-cho-4-nguoi` → `nau-cho-4`. Metadata độc lập đọc lại xác nhận đúng. Retest dữ liệu24/24 trên Chromium/Firefox/mobile, API56/56; full browser hồi quy trên dataset sau sửa được ghi trong QA05 `qa05-full-after-tagfix-2026-11-27/final-results.json`, có retest riêng exhaustion theo nhãn “Đã xem hết gợi ý”. Ma trận mới `qa06-acceptance-matrix-after-tagfix-2026-11-27.json/.md` dùng evidence mới cùng source và FE11 compatibility25/11 cùng code. Sẵn sàng review sau CI; quyết định nghiệm thu release thuộc PO.

Giới hạn vẫn công khai: nhánh unknown-ID404 đã test, live HIDDEN/DELETED chưa tạo riêng; no-recipe dùng HTTP fixture; không tự đóng Jira hoặc đổi dữ liệu khác. Seed DA04 cần TV3 đồng bộ ở nguồn nạp, vì repo tích hợp không có seed slug sai. Các số48/1 và45/4 bên dưới là lịch sử trước sửa tag.

## Hiện trạng 27/11/2026

Ma trận `qa06-acceptance-matrix-2026-11-27.json/.md`: **48 PASS / 1 FAIL / 0 BLOCKED / 0 NOT RUN / 49 AC**. Source PO chọn vẫn PR #36 `4549d4e`, main chưa đổi; PR revert #33 đã đóng không merge. Kết hợp full regression ngày 25/11 trên cùng source với live retest bốn AC dữ liệu ngày 27/11. Metadata DB độc lập xác nhận pantry/vùng miền đã có và ba AC tương ứng đạt. `S2-01.4` FAIL vì tag Nấu cho 4 người có slug `nau-cho-4-nguoi` thay vì contract `nau-cho-4`; canonical request trả [] thay vì món 39/43/47/49/57. Không còn blocker thiếu dữ liệu, nhưng cần TV3/DA04 sửa seed/tag theo BUG-S2-007 rồi retest. Firefox bước AND/bỏ chip còn timeout hai lượt, retained FAIL; chưa kết luận bug sản phẩm mới. QA06 vẫn draft vì P0 S2-01.4 chưa đạt. Evidence mới trên nhánh QA05; handoff hướng dẫn từng bước tại docs/qa05-data-handoff-2026-11-27.md. Các mốc bên dưới là lịch sử.

## Retest trên bản PO chọn — 25/11/2026

PO chọn `hien/FE10-qa-fixes@4549d4ed44f7cc19af11c48f2b57aff466e13990` (bao gồm INT03). QA05 đã chạy lại mọi lớp dùng cho ma trận trên **cùng HEAD**: HTTP API live 56/56 PASS, frontend full-flow Chromium/Firefox/mobile 108 PASS / 9 BLOCKED, FE11 compatibility browser 33/33 PASS. Ma trận `qa06-acceptance-matrix-2026-11-25.json/.md` sinh lại từ evidence cùng SHA: **45 PASS, 0 FAIL, 4 BLOCKED, 0 NOT RUN / 49 AC**. Bốn AC chưa đạt điều kiện dữ liệu là `S2-01.4`, `S2-01.12` (P1), `S2-02.7`, `S2-02.8`. Dataset đọc ngày 25/11 có 0 tag, 0 liên kết tag, 0 vùng miền, 0 pantry; không tự ghi fixture lên Supabase chung. Khi nhóm cấp dữ liệu QA, retest bốn AC và xác nhận release SHA cuối trước khi chuyển PR #30 khỏi draft. Các đoạn bên dưới là lịch sử trước lượt retest này.

## Ma trận mới sau browser retest — 25/11/2026

Ma trận `qa06-acceptance-matrix-2026-11-25.json/.md`: **45 PASS, 0 FAIL, 4 BLOCKED, 0 NOT RUN** trên 49 AC. Browser thật trên `hien/FE10-qa-fixes@30b7fc2` + INT03: Chromium desktop, Firefox desktop, Chromium mobile đều 36 PASS / 3 BLOCKED checkpoint; năm AC trước đây FAIL đã PASS. API 56/56 và FE11 compatibility 33/33 là bằng chứng từ backend/FE11 source trước đó không đổi, chưa chạy lại cùng SHA. Bốn AC chờ dữ liệu tag AND, vùng miền, pantry; release main còn chưa chốt. QA06 chưa nghiệm thu khi còn P0 BLOCKED. Các số 40/5/4 phía dưới là lịch sử trước bản sửa FE10.

## Bản sửa FE10 đang chờ hồi quy — 25/11/2026

PR [#36](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/36) tại `30b7fc2` trên nền INT03 sửa code cho ba bug và đạt frontend 229/229 tests, lint/build. Ma trận 40/5/4 vẫn phản ánh browser evidence của source trước fix. QA cần chạy năm AC từng fail trên PR #36 trong Chromium/Firefox/mobile; sau khi có tag, vùng miền, pantry từ nhóm thì chạy bốn AC blocked và sinh lại matrix trên cùng release SHA. Không chuyển PR #30 sang review từ unit test.

## Cập nhật INT03 — 25/11/2026

Nhánh `origin/linh/int03@9f8a6cb` đã push đúng thứ tự PO docs, BE09 tests, DB grants, FE10, FE11; không áp revert. Backend công bố 258 Vitest + 10 Node, frontend 227 tests, lint/build và guest `/api/me` 401. Main vẫn `413a7b6`, nên INT03 chưa là release main. Diff code FE10 liên quan ba lỗi `BUG-S2-003..005` chưa có sửa; ma trận 40 PASS / 5 FAIL / 4 BLOCKED vẫn là bằng chứng browser gần nhất, không tự nâng trạng thái AC nhờ các test mới. Cần retest release SHA sau khi fix và có dữ liệu tag/vùng miền/pantry.

PR [#30](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/30) vẫn draft. Kết quả dựa trên ứng viên QA `main@413a7b6` + FE10 `587171e` + FE11 `e8de078` (`e47c5f6`), không phải phê duyệt giữ merge PR #32 hay merge revert PR #33.

## Kết quả

| Lớp kiểm tra | Kết quả |
|---|---:|
| API thật qua app/router + Supabase | 56/56 PASS |
| Frontend suite | 227/227 PASS |
| Backend Vitest + Node | 243/243 PASS |
| Browser full flow, 3 cấu hình | 96 PASS / 12 FAIL / 9 BLOCKED checkpoint |
| FE11 compatibility, 3 cấu hình | 33/33 PASS |
| Ma trận chấp nhận | **40 PASS / 5 FAIL / 4 BLOCKED / 0 NOT RUN trên 49 AC** |

P0: 39 PASS, 5 FAIL, 3 BLOCKED trên 47 AC. P1: 1 PASS, 1 BLOCKED. Không cộng số API/browser test thành số AC. Chi tiết từng AC và proof nằm trong `qa06-acceptance-matrix-2026-11-24.md/.json`; file sinh lại bằng `qa06-build-matrix.py`.

## Kết luận theo Story

| Story | PASS | FAIL | BLOCKED | Kết luận |
|---|---:|---:|---:|---|
| S2-01 | 9 | 1 | 2 | Chưa nghiệm thu: lỗi back-state; thiếu tag/vùng miền |
| S2-02 | 15 | 1 | 2 | Chưa nghiệm thu: lỗi back-state; thiếu pantry |
| S2-03 | 8 | 0 | 0 | Đạt trên ứng viên QA; cần retest release SHA |
| S2-04 | 8 | 3 | 0 | Chưa nghiệm thu: thiếu cook time, no-recipe notice, back-state |

Năm AC fail (`S2-01.7`, `S2-02.14`, `S2-04.1`, `S2-04.2`, `S2-04.10`) quy về ba lỗi `BUG-S2-003..005`, không phải năm lỗi độc lập. Bốn AC blocked do dataset không có tag/liên kết tag/vùng miền/pantry. Dataset vẫn đạt ngưỡng cơ bản: 72 món ACTIVE, 299 nguyên liệu chuẩn, 67 món matching-ready.

FE11/S2-02.18 P1 đạt 33/33 compatibility check và code đã xong; không còn chờ FE09 để triển khai. API phân trang đã kiểm tra không trùng/khuyết; recipe25 được kiểm tra định lượng, đơn vị, “Tùy khẩu vị”, thời gian và thứ tự bước trên ba cấu hình. Nhánh hidden-resource của S2-04.7 chưa có dữ liệu live riêng; nhánh unknown ID đã đạt, vì vậy proof này phải được đọc với giới hạn ghi trong JSON.

## Điều kiện để QA06 Done

1. Nhóm chốt quyết định PR #32/#33 và release SHA.
2. Sửa ba lỗi trong `QA05/docs/qa05-bugs-2026-11-24.md`, retest năm AC fail trên SHA mới.
3. TV3/DA04 cung cấp dữ liệu tag, vùng miền, pantry; retest bốn AC blocked mà không sửa DB dùng chung tùy tiện.
4. Chạy smoke hồi quy trên Chromium, Firefox và 390×844; xác nhận CI đúng SHA. Local fallback được dùng vì Hiền không có quyền Vercel, nhưng cần PO ghi nhận.
5. Nhập Jira/owner/severity/hạn và PO review ma trận. Không tuyên bố nghiệm thu khi còn P0 FAIL/BLOCKED nếu chưa có ngoại lệ được PO ghi rõ.

Hai lỗi lịch sử `/api/me` và recipes-list đã retest đạt trên INT02/ứng viên mới; không tự đóng Jira thay nhóm. Endpoint categories trả 500 do quyền bảng là theo dõi P2/Sprint 3 vì scope loại/khẩu vị đã được PO defer.
