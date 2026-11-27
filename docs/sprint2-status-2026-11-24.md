# Trạng thái Sprint 2 — cập nhật 24/11/2026

## Sau sửa tag — 27/11/2026

Người dùng sửa tag ID5 đúng contract, QA đọc lại xác nhận và retest24/24 ca dữ liệu cùng API56/56 trên PR36 `4549d4e`; Firefox AND/bỏ chip đã đạt. Ma trận sau tagfix và hồi quy mới nằm trên QA06, QA05/QA06 đề nghị chuyển review sau CI. Không có merge main hoặc quyết định nghiệm thu thay PO; các báo cáo phía dưới giữ làm lịch sử.

## Hiện trạng 27/11/2026

Source giữ PR36 `4549d4e`, INT03 không đổi; PR revert33 đã đóng không merge. Dữ liệu tag/vùng miền/pantry đã có và đã retest ba browser. Ma trận mới **48 PASS / 1 FAIL / 0 BLOCKED**; S2-01.4 còn FAIL do slug tag Nấu cho4 lệch contract (BUG-S2-007). QA05/QA06 giữ draft, cần TV3/DA04 sửa tag/seed và retest. Xem handoff QA05 ngày27 và matrix QA06 ngày27; các số bên dưới là lịch sử.

## Retest 25/11/2026

INT03 `9f8a6cb` + bản sửa FE10 `30b7fc2` đã qua browser QA trên Chromium desktop, Firefox desktop và Chromium mobile: 36 PASS / 3 BLOCKED checkpoint mỗi cấu hình. Ma trận QA06 mới: **45 PASS, 0 FAIL, 4 BLOCKED / 49 AC**. Năm AC giao diện trước đây FAIL đã PASS; bốn AC về tag AND, vùng miền, pantry vẫn đợi dữ liệu DB QA. Plan dưới đây được gắn trạng thái bản sửa; báo cáo cũ tiếp theo là lịch sử trước retest. Source chưa nằm trên release main.

Nguồn mới nhất đã dùng: `main@413a7b6` (merge PR #32 INT02), FE10 `587171e`, FE09 `786605d`, FE11 `e8de078`, PO `72be7e1`. PR #33 `revert-32-linh/int02` đang đề xuất đưa source về trước merge; kết quả QA dưới đây chạy trên ứng viên có INT02, chưa áp revert.

| Task | Trạng thái hiện tại | Còn lại |
|---|---|---|
| QA04 | Plan 49 AC đã đồng bộ PO và gắn trạng thái từ evidence; PR #27 từng được PO approve ở SHA cũ | Reviewer xác nhận revision mới sau sync/evidence |
| DO04 | CI/gate code xong, 49 backend files syntax PASS; local fallback có hướng dẫn | CI HEAD mới, reviewer và PO xác nhận local thay Vercel |
| QA05 | API 56/56; full browser và FE11 compatibility đã chạy | 3 lỗi sản phẩm, 4 AC thiếu dữ liệu, Jira/retest |
| QA06 | Ma trận 49 AC: 40 PASS, 5 FAIL, 4 BLOCKED | Chưa thể nghiệm thu khi còn P0 FAIL/BLOCKED |
| FE11 | Code xong; FE10 candidate compatibility 33/33 | CI/reviewer/merge; không còn blocker FE09 |

Ba lỗi xác nhận: thiếu cook time ở chi tiết món, thiếu thông báo no-recipe tại entry point chi tiết, và link quay lại luôn về `/search` làm mất trạng thái `/goi-y`. Các AC tag AND, vùng miền và pantry bị blocked vì dataset hiện có 0 bản ghi tương ứng. Đây là khác biệt giữa lỗi code và thiếu dữ liệu, không gộp chung.

PO `72be7e1` dời lọc loại món/khẩu vị sang Sprint 3; endpoint categories 500 do quyền bảng được ghi P2 theo dõi, không dùng để fail P0 Sprint 2. FE11 vẫn P1 Sprint 2 và đã đạt kiểm tra tương thích. Báo cáo ngày 23/11 giữ làm lịch sử; tài liệu này và ma trận QA06 là hiện trạng mới.

Không tự merge/revert main, không tự tạo/gán/đóng Jira và không tuyên bố release được nghiệm thu. Quyết định PR #32/#33 phải được nhóm chốt trước vòng retest cuối.
