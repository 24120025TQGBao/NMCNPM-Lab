# QA05 — dữ liệu đã bổ sung và lỗi còn lại, 27/11/2026

Source PO chọn vẫn là PR #36 `4549d4ed44f7cc19af11c48f2b57aff466e13990`, gồm INT03. Fetch ngày 27/11 không có commit source mới; main vẫn `413a7b6`. PR #33 revert đã đóng, không merge. QA04/DO04/FE11 vẫn là PR ready; QA05/QA06 draft.

Kiểm kê chỉ đọc: 72 món ACTIVE, 299 nguyên liệu, 67 món matching-ready; đã có 5 tag, 25 liên kết tag, 72 món có vùng miền (65 KHAC, 2 BAC, 1 TRUNG, 4 NAM) và 5 pantry ID 5/13/40/41/76. Bộ kiểm tra mới dùng metadata DB làm expected độc lập, kiểm đủ năm chip, giao AND, bỏ chip, vùng miền/AND và pantry bật/tắt trên Chromium desktop, Firefox desktop, Chromium mobile. API/browser cũ ngày 25/11 được giữ làm hồi quy source; không tuyên bố đã chạy lại full suite trên dataset mới.

## BUG-S2-007 — tag Nấu cho 4 người lệch slug contract

AC `S2-01.4` P0 FAIL. `GET /api/suggestions?the=NAU_CHO_4&limit=10` trả `200 []` mặc dù tag DB gắn năm món 39,43,47,49,57. DB hiện `tag.ma_tag=5, slug=nau-cho-4-nguoi`; contract mục 7.0 và helper `tagCodeToSlug` quy định `NAU_CHO_4 ↔ nau-cho-4`. Backend không tìm được tag hợp lệ; thay đổi expected để chấp nhận [] sẽ che lỗi.

Đề xuất owner TV3/DA04, phối hợp PO/BE08; severity cần nhóm xác nhận. Jira chưa tạo. Không có mutation DB nào do QA thực hiện.

## Phần nhóm cần thực hiện

1. Trên DB QA, kiểm tra tag ID5 và các liên kết món hiện có; kiểm tra có sẵn slug `nau-cho-4` hay chưa.
2. Nếu chưa có slug chuẩn, TV3 cập nhật seed/migration DA04 và đổi slug của đúng ID5 sang `nau-cho-4` bằng quy trình DB của nhóm, giữ nguyên liên kết món. Nếu đã có slug chuẩn khác ID thì nhóm cần hợp nhất liên kết/tag để tránh trùng; không chạy UPDATE mù.
3. Ghi nhận migration/seed commit và DB đích; PO không cần đổi contract hiện có.
4. QA đọc lại metadata rồi chạy lại `qa05-data-dependent.cjs`: năm chip và AND phải đạt, đặc biệt NAU_CHO_4 phải trả năm món trên theo `limit=10`; chạy full smoke trên release SHA/dataset cuối trước nghiệm thu.

Vùng miền và pantry đã có kiểm tra dương tính; các AC tương ứng không còn BLOCKED. Mỗi ca ghi source SHA, mode LIVE_WITH_INDEPENDENT_DB_ORACLE và expected từ `qa05-data-oracle-2026-11-27.json`. Firefox có retest riêng cho timeout bước bỏ chip; đọc bản kết quả chuẩn hóa cùng raw evidence để truy vết.
