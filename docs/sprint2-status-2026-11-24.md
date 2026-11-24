# Trạng thái Sprint 2 — cập nhật 24/11/2026

Nguồn fetch mới: main23bcb17, FE09786605d, INT02449d189, BE09c7ceb72, PO72be7e1, BE12102ce6b. Thay thế kết luận hiện trạng trong report23/11; giữ report cũ làm lịch sử.

| Task | Đã làm | Còn để Done |
|---|---|---|
| QA04 | Plan49 AC đồng bộ PO mới, ghi phần lọc loại/khẩu vị dờiSprint3; P1FE11 đã có test đủ | PO review/xác nhận |
| DO04 | CodeCI và PR28 xanh; hướng dẫn demo local | Reviewer và PO/INT02 xác nhận local fallback, không có quyền Vercel |
| QA05 | API40/40 trên INT02 thực,5 oracle; hai lỗi route cũ retest đạt; browser smoke và bằng chứng FE11 | Full AC trên bản cuối, FE10, controlled tag/pantry/hidden cases, Jira/PO |
| QA06 | Đã cập nhật retest không còn2 lỗi route trên INT02 | QA05/FE10/full hồi quy và PO ký nghiệm thu |
| FE11 | Đã merge FE09 vào riêng nhánh FE11 theo yêu cầu; đủ Mua thêm/ghim/copy trên UI,214 tests và33 browser checks đạt | CI SHA cuối/reviewer/merge; không còn blocker phải đợi FE09 merge mới viết code |

FE11 giữ public HTTP/shared client/adapter/slots FE09. Pin membership qua catalog ingredients có phân trang, ưu tiên ổn định trong nhóm, không sửa điểm/nhóm; shoppinglist chỉ món được chọn. Test thật BE12 bộ7 mở món33 qua Sườn heo56; thêm56 thành100%/8of8. Lỗi HTTP và clipboard được mô phỏng trong browser, không sửa DB.

Hai lỗi cũ đã đạt trên nhánh tích hợp449d189: /api/me401 và /api/dishes/33/recipes200. Không kết luận main đã chứa bản sửa vì main chưa merge. INT02 đã xuất hiện trên remote, không còn chờ nhánh tích hợp được push; vẫn chờ FE10 và nghiệm thu chung. FE10 không thuộc FE11 và vẫn là placeholder.

PO72be7e1 dời bộ lọc loại món/khẩu vị sangSprint3; FE11 vẫnP1 Sprint2. Không tự tạo/gán/đóng Jira hoặc nhắn thành viên. Các PR riêng giữ đíchmain; FE11 có merge dependency FE09 nên review riêng diff từ786605d nếu cần. Không merge main trong phiên.
