# QA06 — Báo cáo hồi quy Sprint 2, 24/11/2026

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
