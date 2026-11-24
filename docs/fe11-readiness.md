# FE11 — Đã hoàn thiện code và kiểm thử trên nền FE09, 24/11/2026

PR: [#31](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/31). FE11 vẫn P1 Sprint 2 theo PO. Theo yêu cầu mới của người dùng, đã merge FE09 `786605d` vào RIÊNG `hien/FE11` thay vì chờ FE09 vào main. Không sửa nhánh Hương, không merge vào main. Các commit tự tạo dùng Nguyễn Hà Minh Hiền, không co-author; giữ lịch sử tác giả commit FE09 khi merge dependency.

## Đã thực hiện đủ ba phần

- **Mua thêm:** gọi BE12 bằng shared get client, gửi ID/pantry/AbortSignal, map snake_case→camelCase trong adapters.js. Hiện trong unlockSectionSlot của FE09, có loading/lỗi/thử lại; data=[] ẩn section. Nút Đã có nguyên liệu này thêm ID chuẩn vào chip; người dùng bấm Tìm món để cập nhật. Không tính lại unlock_count hoặc logic RPC ở frontend.
- **Ghim:** nút ở IngredientChip.actions, chỉ ghim ID đã chọn; session lưu ghim, xóa nguyên liệu bỏ ghim tương ứng. Xác minh món chứa nguyên liệu qua GET /api/dishes?ingredients=<ID>&page=...&limit=50 (catalog BE09 công khai), không suy từ missing[]. Hợp kết quả của nhiều ID ghim, cache trong lượt sử dụng, abort request cũ. Ưu tiên ổn định trong từng nhóm, giữ ratio/readiness/isIncomplete; bỏ ghim khôi phục thứ tự API. Nếu API lỗi giữ thứ tự ban đầu và cho retry. Đây là ưu tiên P1 khi người dùng chủ động ghim; không ghim thì giữ nguyên thứ tự API theo S2-02.11.
- **Danh sách đi chợ:** checkbox riêng ngoài Link của từng thẻ món có phần thiếu. Chỉ gom missing của những món đã chọn, loại trùng ID, không bịa định lượng. Lưu lựa chọn khi back/reload, xóa lựa chọn cho truy vấn kết quả mới. Copy chỉ báo thành công sau Clipboard API resolve, lỗi quyền hiện thông báo tiếng Việt; danh sách đổi thì bỏ feedback cũ. Món incomplete có cảnh báo danh sách chỉ gồm phần thiếu đã biết.

Không còn thiếu hook, slot, session, metadata ghim hay nút copy trên giao diện. Không cần thêm field/RPC backend. FE10 vẫn là placeholder của thành viên khác nhưng không chặn ba tính năng FE11.

## Bằng chứng

- Frontend: full suite 214/214 PASS, gồm test FE09 và FE11; 20 test mới cho HTTP contract, pagination, UI, session, request race. Sau đổi thông báo clipboard đã chạy lại 9 primitive tests PASS và browser kiểm tra lỗi quyền.
- Lint: không lỗi, không warning mới của FE11; còn 4 warning đã có từ FE09. Build production với VITE_USE_MOCK=false và VITE_USE_MOCK_API=false PASS, không xuất chunk mock mới.
- API thật trên backend INT02 `449d189`: **40/40 PASS**, bao gồm 5 oracle tính độc lập món33, BE12 mẫu và catalog membership, /api/me401 và /api/dishes/33/recipes200. Xem fe11-int02-api-result.json.
- Browser thật trên frontend FE11 và backend INT02 + Supabase: Chromium desktop, Firefox desktop, Chromium390×844, **33/33 PASS**. Xem fe11-browser-evidence/results.json và ảnh. Chromium kiểm tra clipboard native; Firefox dùng clipboard implementation kiểm soát. Lỗi BE12/catalog và [] được fault-inject ở HTTP browser, không sửa DB.

Ví dụ ghim thực tế: bộ7 nguyên liệu món33; ghim Khổ qua55 đưa món chứa55 lên đầu nhóm Cần đi chợ, giữ đúng nhóm/ratio; bỏ ghim trở lại thứ tự RPC. Ví dụ Mua thêm: 5,6,8,11,28,55,57 → Sườn heo56 mở món33; thêm56 và tìm lại →100%,8/8.

## Review và nghiệm thu còn lại

Code/test FE11 đã xong, sẵn sàng review; PR cần CI trên SHA cuối và reviewer duyệt, không tự merge/approve. PR vẫn vào main như kế hoạch; vì chứa merge dependency FE09, có thể review riêng diff `786605d...hien/FE11`, rồi nhóm merge FE09 trước hoặc xử lý thứ tự tích hợp. Main và nhánh Hương giữ nguyên.

Không đồng nghĩa QA05/QA06 hoặc toàn Sprint đã Done: full AC/P0, FE10, dataset tag/pantry, PO/Jira và bản main tích hợp cuối còn theo báo cáo QA. Hai lỗi API cũ đã retest đạt trên nhánh INT02 mới, chưa chứng minh main đã được sửa vì main chưa merge.

Hướng dẫn chạy lại, cấu hình và giới hạn: [fe11-validation.md](fe11-validation.md).
