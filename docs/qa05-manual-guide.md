# QA05 — Kết quả tự động và phần cần làm thủ công, 24/11/2026

## Sau khi sửa tag — sẵn sàng review ngày 27/11/2026

Người dùng sửa tag ID5 sang `nau-cho-4` đúng contract; QA đọc lại metadata và chạy trên PR36 `4549d4e` + Supabase thật. Bộ dữ liệu dương tính đạt24/24 trên Chromium desktop, Firefox desktop, Chromium mobile; Firefox AND/bỏ chip đã đạt khi runner chờ đúng trạng thái UI thay vì phụ thuộc sự kiện response. API56/56 đạt. Hồi quy full-flow sau sửa dữ liệu được chuẩn hóa bằng retest riêng ca exhaustion: tag có món nên phải xem hết các món thật, UI hiện “Đã xem hết gợi ý”. Raw evidence được giữ.

Ma trận sau sửa tag ở QA06 `qa06-acceptance-matrix-after-tagfix-2026-11-27.json/.md`. Không còn bug tag tái hiện; đề xuất chuyển QA05 sang review, không coi là PO nghiệm thu hoặc merge. Giới hạn: không tạo live HIDDEN/DELETED fixture trên DB chung; ca404 dùng unknown ID, no-recipe dùng HTTP fixture được ghi mode. FE11 compatibility33/33 từ lượt25/11 trên cùng code được giữ, không tuyên bố đã rerun FE11 ở lượt này. TV3 nên đồng bộ seed DA04 bên ngoài source đang có. Các mốc bên dưới là lịch sử.

## Hiện trạng 27/11/2026 — dữ liệu đã có, còn lệch slug tag

Fetch lại: source PO chọn PR #36 vẫn `4549d4e`; PR revert #33 đã đóng không merge. Kiểm kê Supabase hôm nay có 5 tag, 25 liên kết, 72 món có vùng miền, 5 pantry. Đã chạy ca dữ liệu dương tính trên Chromium desktop, Firefox desktop, Chromium mobile bằng expected độc lập từ metadata DB. Vùng miền, pantry bật/tắt đều đạt; Chromium desktop/mobile đạt cả AND/bỏ chip. Chip `NAU_CHO_4` trả [] trên cả ba dù có năm món gắn tag: DB dùng `nau-cho-4-nguoi`, contract yêu cầu `nau-cho-4`. Firefox bước AND/bỏ chip timeout cả retest, giữ FAIL evidence và chưa phân loại thành bug sản phẩm thứ hai.

Ma trận mới **48 PASS / 1 FAIL / 0 BLOCKED / 49 AC**. `S2-01.4` còn FAIL, theo `BUG-S2-007`; chi tiết và hướng dẫn TV3/DA04 ở [qa05-data-handoff-2026-11-27.md](qa05-data-handoff-2026-11-27.md). QA không ghi/sửa DB. Evidence chuẩn hóa `qa05-data-evidence-2026-11-27/final-results.json` (20 PASS / 4 FAIL checkpoint, gồm ba lần cùng lỗi tag và một Firefox timeout), oracle `qa05-data-oracle-2026-11-27.json`. PR #29 giữ draft. Các mốc bên dưới là lịch sử.

## PO chọn PR #36 — chạy lại đúng SHA ngày 25/11/2026

PO xác nhận tiếp tục dùng bản tích hợp `hien/FE10-qa-fixes@4549d4ed44f7cc19af11c48f2b57aff466e13990` (gồm INT03 `9f8a6cb`). Đã chạy lại **trên đúng HEAD này** bằng backend GET-only với Supabase thật, cả hai mock flag false: API **56/56 PASS**; luồng browser QA05 Chromium desktop, Firefox desktop, Chromium mobile **108 PASS / 9 BLOCKED / 0 FAIL**; FE11 compatibility browser **33/33 PASS**. Mỗi cấu hình full-flow có 36 PASS và 3 BLOCKED, không cộng số checkpoint thành AC. Evidence mới: `qa05-fe10-fix-api-2026-11-25.json`, `qa05-pr36-browser-2026-11-25/results.json`, `qa05-fe11-compat-2026-11-25/results.json`.

Kiểm kê DB cùng SHA tại `qa05-dataset-audit-2026-11-25.json`: 72 món ACTIVE, 299 nguyên liệu chuẩn, 67 món matching-ready; **0 tag, 0 liên kết món–tag, 0 vùng miền, 0 pantry**. Bốn AC vẫn BLOCKED do dữ liệu; cần TV3/DA04 bổ sung trên DB QA rồi retest. Ma trận QA06 ngày 25/11 được sinh lại từ chính ba suite này: 45 PASS / 0 FAIL / 4 BLOCKED. PR #29 giữ draft cho đến khi bốn AC và release SHA cuối được xử lý. Các đoạn bên dưới ghi lại mốc kiểm thử trước khi PO xác nhận PR #36.

## Browser retest bản sửa — 25/11/2026

Trên `hien/FE10-qa-fixes@30b7fc2` (nền INT03 `9f8a6cb`), API thật qua backend GET-only: Chromium desktop, Firefox desktop và Chromium mobile mỗi cấu hình **36 PASS, 3 BLOCKED**. Firefox khởi động lỗi trong sandbox, chạy lại riêng ngoài sandbox đạt. `qa05-fe10-fix-evidence/final-results.json` là bản tổng hợp chuẩn; ba BLOCKED mỗi trình duyệt là tag, vùng miền, pantry thiếu dữ liệu. Năm AC thuộc `BUG-S2-003..005` đã PASS trên browser. Ma trận QA06 ngày 25/11: **45 PASS / 0 FAIL / 4 BLOCKED**; không coi các bug lịch sử là đã đóng Jira. Cần dữ liệu QA thật để retest bốn AC và chốt SHA release trước khi đổi PR #29 khỏi draft.

## Bản sửa FE10 đang chờ browser QA — 25/11/2026

Đã tạo PR [#36](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/36), nhánh `hien/FE10-qa-fixes@30b7fc2` từ `main@413a7b6` rồi fast-forward INT03 `9f8a6cb`. Code xử lý ba lỗi `BUG-S2-003..005`; frontend 229/229 tests, lint và build đạt. Hai test mới kiểm tra trang chi tiết có thời gian/danh sách công thức, empty state và nguồn quay về `/goi-y`. Đây là bản sửa đề xuất, chưa cập nhật 5 AC FAIL thành PASS trước khi chạy browser trên đúng SHA `30b7fc2`. Bốn AC BLOCKED vẫn cần tag, vùng miền và pantry thật trên DB QA. Khi dữ liệu có, audit ID/cờ rồi chạy lại ma trận; không giả lập dữ liệu DB chung.

## Cập nhật INT03 — 25/11/2026

`origin/linh/int03@9f8a6cb` đã push, ghép `sprint2-po-be → be09 → db → FE10 → FE11` trên main `413a7b6`, sau đó bỏ dependency `d` và cập nhật demo. `docs/api.md` mục 7 v2.0 là contract chính; `docs/catalog-handoff.md` ghi sáu điểm khác implementation. INT03 công bố BE 258 Vitest + 10 Node, FE 227 test, lint/build và `/api/me` guest 401. Đây là bằng chứng của nhánh INT03, chưa thay thế kết quả browser QA của nhánh ứng viên trước. Code `DishDetailPage.jsx` và `catalogNavigation.js` của FE10 trong INT03 vẫn là source đã tái hiện BUG-S2-003..005; chưa có commit sửa ba lỗi. Sau khi nhóm chốt INT03 làm release, chạy lại năm AC fail và bốn AC thiếu dữ liệu trên đúng HEAD release trước khi chuyển PR này khỏi draft. Không merge revert PR #33.

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
