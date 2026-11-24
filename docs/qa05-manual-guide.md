# QA05 — Kết quả tự động và phần cần làm thủ công, 24/11/2026

PR [#29](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/29) giữ trạng thái draft vì ứng viên còn lỗi P0 và thiếu dữ liệu kiểm thử. FE10 đã có trên `587171e`, không còn là blocker “chưa có code”. Ứng viên QA ghép `main@413a7b6` + FE10 + FE11 tại `e47c5f6`; nhánh revert PR #33 chưa được áp vào ứng viên này.

## Đã tự thực hiện

| Phần | Kết quả |
|---|---:|
| API thật qua app/router + Supabase, chỉ GET | 56/56 PASS |
| Frontend unit/component trên ứng viên | 227/227 PASS |
| Backend Vitest + Node | 243/243 PASS |
| Full browser flow, 3 cấu hình | 96 PASS / 12 FAIL / 9 BLOCKED trên 117 checkpoint |
| FE11 compatibility, 3 cấu hình | 33/33 PASS |
| AC QA04 đã quy về ma trận | 40 PASS / 5 FAIL / 4 BLOCKED trên 49 AC |

Không cộng checkpoint thành AC. 12 browser FAIL là cùng ba lỗi sản phẩm lặp trên ba trình duyệt: xem `qa05-bugs-2026-11-24.md`. Kiểm tra pantry ban đầu dùng sai selector đã được thay bằng targeted retest 3/3 PASS; `final-results.json` là kết quả chuẩn hóa, raw result vẫn giữ để truy vết.

Dataset đọc được có 72 món ACTIVE, 299 nguyên liệu chuẩn, 67 món đủ điều kiện matching; đạt ngưỡng số lượng. Tuy nhiên không có tag, liên kết tag, món có vùng miền hoặc nguyên liệu pantry, nên bốn AC dương tính tương ứng bị BLOCKED. ID nguyên liệu 2 hiện không dùng trong công thức nên đã dùng hợp lệ để xác minh match rỗng và BE12 `[]`.

## Bằng chứng và chạy lại

- API: `qa05-fe10-candidate-api-2026-11-24.json`, runner `qa05-int02-api-check.mjs`.
- Browser chuẩn hóa: `qa05-full-flow-evidence/final-results.json`, runner `qa05-full-flow.cjs`.
- FE11: `qa05-p1-compat-evidence/results.json`, runner `qa05-fe11-compat.cjs`.
- Dữ liệu: `qa05-dataset-audit-2026-11-24.json`.
- Chi tiết định lượng/các bước công thức: `qa05-recipe-facts-evidence/results.json`, 3/3 PASS.

Runner API và browser chỉ đọc dữ liệu thật; các response 500/delay/no-recipe dùng HTTP fault/fixture được ghi rõ trong evidence. Không có fixture nào được ghi lên Supabase chung. Có thể chạy lại API bằng `QA_API_BASE`, `QA_SOURCE_REF`, `QA_DATASET_AUDIT` và `QA_RESULT_FILE`; chạy browser bằng `QA_BASE_URL`, `QA_API_BASE`, `QA_PLAYWRIGHT`, `QA_BROWSER_ROOT`. Không đưa key lên command line hoặc commit `.env`.

## Bạn/nhóm cần làm thủ công để QA05 Done

1. PO/INT02 quyết định giữ merge PR #32 hay merge revert PR #33. Chốt đúng SHA release; kết quả hiện tại chứng nhận ứng viên có INT02, không chứng nhận cây source sau revert.
2. Tạo ba Jira từ `qa05-bugs-2026-11-24.md`, xác nhận severity/owner/hạn; tạo thêm taxonomy P2 nếu PO muốn theo dõi Sprint 3.
3. FE10/FE09 sửa ba lỗi, rồi QA retest các AC `S2-01.7`, `S2-02.14`, `S2-04.1`, `S2-04.2`, `S2-04.10` trên SHA cuối.
4. TV3/DA04 chuẩn bị dữ liệu QA cho tag AND, vùng miền và pantry. Xác nhận ID/cờ trước khi chạy; không sửa production/shared DB chỉ để làm test pass.
5. Chạy lại bốn AC blocked và full smoke trên release SHA. Ghi browser, SHA, URL local, actual/evidence và liên kết Jira. Không cần quyền Vercel: dùng local fallback của DO04 nếu PO chấp thuận.
6. PO review ma trận QA06. Chỉ chuyển PR QA05 khỏi draft khi không còn P0 FAIL/BLOCKED hoặc PO ghi nhận ngoại lệ rõ ràng.

Collection Postman 41 GET vẫn là công cụ bổ sung. Suite tự động 56 check đã đáp ứng lựa chọn “collection hoặc automated tests”; không biến việc chạy lại toàn bộ collection fixture thành blocker mới. Nếu dataset đổi, phải audit lại trước khi dùng ID 2 cho ca rỗng.
