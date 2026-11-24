# Trạng thái Sprint 2 — cập nhật 24/11/2026

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
