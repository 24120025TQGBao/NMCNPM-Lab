# FE11 — Chưa sẵn sàng, dời Sprint 3

SE_SP2.md ghi P1 phụ thuộc FE09/BE12. PO02 5aae4f6 (AC S2-02.18, mục 4) và api.md 7.8 đã dời mua thêm/ghim/sao chép sang Sprint 3 vì chưa có RPC. Main 23bcb17 chưa có FE09; FE09 786605d là nhánh đã push, chưa merge. Không triển khai UI giả BE12 để coi task xong.

## Contract frontend phải kế thừa

- Dùng frontend/src/api/adapters.js và get từ frontend/src/lib/api/client.js của Hương: HTTP snake_case → view model camelCase. Không tạo client/theme/layout riêng.
- MatchResults.jsx có unlockSectionSlot (#fe11-unlock-slot) dành cho FE11. Phối hợp Hương sau FE09 merge, hạn chế sửa component chung.
- BE12 dự kiến GET /api/ingredients/suggest-next?ingredients=CSV, data:[{ingredient:{id,name},unlock_count,dish_ids}], giảm dần unlock_count, [] ẩn mục. RPC/tham số/giới hạn còn TODO, không tự chốt.
- Không tính lại matchRatio/readiness; isIncomplete ưu tiên nhóm 4, giữ logic nhóm FE09.
- Ghim đổi thứ tự đang xung đột S2-02.11 giữ thứ tự API; PO cần chốt quy tắc ưu tiên ghim Sprint 3.
- Cần chốt phạm vi danh sách đi chợ với PO, sao chép đúng phần thiếu, xử lý Clipboard API thành công/thất bại và không báo thành công khi bị từ chối.

## Điều kiện mở lại

1. PO đưa FE11/BE12 trở lại scope và chốt AC, thứ tự ghim, pantry cho BE12.
2. FE09 merge main, BE12/RPC có contract và endpoint thật qua 3–5 ca cùng TV3.
3. Cập nhật nhánh FE11 từ main mới, dùng slot/component sẵn có, review Hương và CI xanh.

BLOCKED/DEFERRED. Commit tài liệu không phải hoàn thành tính năng, chưa có PR/reviewer duyệt.
