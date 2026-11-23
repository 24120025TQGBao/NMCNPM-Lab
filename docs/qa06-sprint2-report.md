# QA06 — Baseline hồi quy Sprint 2, 23/11/2026

Chưa phải báo cáo nghiệm thu cuối. Main 23bcb17 vẫn Sprint 1. Đã đọc FE09 786605d, BE08 5e0887b, BE11 5567501, BE09 41e2a65, BE10 0a5a8b3, DB 23b78ef, PO02/BE07 5aae4f6.

| Story | Kết luận hiện tại | Lý do |
|---|---|---|
| S2-01 | CHƯA NGHIỆM THU | FE08/BE08 chưa ghép main, chưa chạy luồng thật |
| S2-02 | CHƯA NGHIỆM THU | Chờ INT02, 5 ca live, quyền RPC và dữ liệu |
| S2-03 | BLOCKED | SearchPage là placeholder FE10 |
| S2-04 | BLOCKED | DishDetailPage/RecipeDetailPage là placeholder FE10 |
| S2-02.18 / FE11 | DEFERRED | PO dời Sprint 3, thiếu BE12/RPC |

Hồi quy tích hợp chưa chạy: pass=0, fail=0; số BLOCKED/NOT RUN từng case phải phân loại từ 49 case QA04 sau nhập kết quả thực tế. Không tính deferred là pass. Chưa có xác nhận INT02, kết quả browser/mobile hoặc Jira được giao/đã sửa.

## Bằng chứng local, tách khỏi nghiệm thu

BE08: 163 Vitest+6 Node PASS; BE11:111+6 PASS; BE10:50+6 PASS; FE07–09:185 PASS. Suite chồng lắp, không cộng thành số case độc lập. Dùng snapshot git archive không .env và node_modules local qua junction; không phải npm ci sạch hoặc API Supabase thật. BE10 chưa có suite match mới. QA05 collection 35 GET parse PASS nhưng chưa chạy trên môi trường tích hợp.

BUG-S2-001 đã tái hiện: GET /api/me guest main →401 UNAUTHORIZED, BE10 →404 NOT_FOUND. Xem script docs/qa05-route-regression.mjs trên nhánh hien/QA05. Đề xuất Châu/INT02 giữ route main, severity/owner/hạn sửa cần nhóm xác nhận. Jira CHƯA TẠO, chưa retest bản sửa.

## Các bước hoàn tất

1. INT02 tích hợp FE/BE/DB, giữ API/test Sprint 1; nhập QA04/QA05/DO04. Ghi SHA cuối, URL, migration, ngày/runner/browser/dataset.
2. Chạy mọi P0 QA04 và collection QA05 với API thật; lưu actual/JSON/ảnh đã lọc token. Có fixture chuẩn để đối chiếu 5 ca tính tay.
3. Chromium và Firefox desktop chạy Gợi ý → Gợi ý khác không lặp → Nấu món này → chi tiết → Tự nấu → danh sách → chọn công thức → back giữ trạng thái.
4. Theo nguyên liệu: chặn 0 ID, autocomplete/alias/chip, toggle pantry, đủ 4 nhóm gồm INCOMPLETE dù 100%, mở món/công thức/back. Tìm không dấu/lọc AND/phân trang/back. Lặp hai luồng tại 390×844, ghi mô phỏng hay thiết bị thật.
5. Hồi quy /api/me, login, feed/detail/create post. Retest bug trên SHA sửa. Mọi case ghi actual/status/evidence/runner/SHA, mọi bug có Jira/severity/owner/hạn/trạng thái.
6. Báo tổng PASS/FAIL/BLOCKED/NOT RUN/DEFERRED theo P0/P1; kết luận từng Story theo toàn bộ AC P0. Không P0 mở mới đề xuất đạt; PO/INT02 xác nhận và bạn chia sẻ trước Review.

Rủi ro: FE10 chưa xong, nhánh chưa merge, regression Sprint 1, quyền RLS/RPC, tag/role/pantry và dataset ≥30 món/≥20 món đủ dữ liệu chưa được kiểm chứng trên môi trường chung. PO chưa chốt hạn Sprint mới; không dùng hạn 21/11 cũ để tuyên bố đúng hạn. Chưa gửi báo cáo/tin nhắn thay bạn.
