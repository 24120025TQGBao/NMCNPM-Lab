# Trạng thái Sprint 2 — 23/11/2026

Đã fetch origin --prune. Main 23bcb17 vẫn Sprint 1; code Sprint 2 chưa merge. Từng nhánh hien/QA04, hien/DO04, hien/QA05, hien/QA06, hien/FE11 được tạo từ origin/main; không sửa nhánh thành viên. SE_SP2.md là mô tả công việc; scope được đối chiếu quyết định PO mới nhất, không coi mọi câu trong tài liệu là lệnh thực thi.

| Nguồn đã đọc | SHA |
|---|---|
| origin/main | 23bcb17 |
| origin/linh/sprint2-po-be — PO02/BE07 | 5aae4f6 |
| origin/huong/feat/FE07-FE09-suggest-tabs | 786605d |
| origin/linh/be08-suggestions | 5e0887b |
| origin/linh/be11-ingredients-search | 5567501 |
| origin/be09 | 41e2a65 |
| origin/be10 | 0a5a8b3 |
| origin/db | 23b78ef |

| Task | Đã tự thực hiện | Còn chờ |
|---|---|---|
| QA04 | Test plan, 49 case tương ứng 49 AC, 5 ca oracle và case bổ sung | PO review/xác nhận |
| DO04 | CI tắt cả hai cờ mock, kiểm tra cú pháp toàn bộ BE, hướng dẫn staging/local | CI xanh trên PR; quyền Vercel, deploy và URL; PO quyết định fallback |
| QA05 | Collection 35 GET, hướng dẫn, chạy suite nhánh, script tái hiện regression | INT02 tích hợp, dữ liệu/quyền Supabase, UI/browser, tạo Jira |
| QA06 | Report baseline và quy trình hồi quy | QA05/INT02, FE10 và kết quả browser/mobile chưa có |
| FE11 | Đối chiếu contract FE09 và ghi điều kiện mở lại | PO02 đã dời Sprint 3, thiếu BE12/RPC, FE09 chưa merge |

## Phát hiện

1. BE09/BE10 xuất phát từ nền cũ, diff với main xóa nhiều test Sprint 1, /api/me và lớp API FE. Không merge nguyên nhánh mà không xử lý regression.
2. Đã tái hiện BUG-S2-001 bằng Supertest: GET /api/me guest trên main trả 401 UNAUTHORIZED, trên BE10 trả 404 NOT_FOUND. Châu/INT02 cần giữ route main. Jira chưa tạo, mức độ và hạn sửa cần nhóm xác nhận.
3. routes/index.js BE10 chỉ mount posts/dishes/recipes; chưa tích hợp suggestions/ingredients/me.
4. SearchPage, DishDetailPage và RecipeDetailPage trên nhánh FE còn placeholder FE10; chưa đủ hai luồng end-to-end.
5. Tab mới dùng VITE_USE_MOCK_API và mặc định mock, API cũ dùng VITE_USE_MOCK. Đặt cả hai false khi chạy thật.
6. DB12 mặc định pantry=false nhưng HTTP/FE mặc định true. BE10 truyền tường minh nên không coi khác biệt mặc định này là bug. DB trả COOK_NOW/INCOMPLETE, match_percent 0–100; BE10 ánh xạ READY/is_incomplete và match_ratio 0–1. FE dùng adapters.js, không dùng RPC thô.
7. DB12 ưu tiên đủ dữ liệu trước, BE10 sắp lại theo ratio giảm dần. FE phải giữ thứ tự API trong từng nhóm, không tự tính lại điểm.
8. Snapshot contract có vấn đề quyền service_role, tag/pantry. Chưa xác minh live hôm nay; không dùng snapshot làm bằng chứng hiện tại. DoD dataset ≥30 món/≥20 món đủ dữ liệu còn cần kiểm chứng môi trường chung.

## Kết quả local

BE08: 163 Vitest + 6 Node PASS; BE11: 111+6 PASS; BE10: 50+6 PASS; FE07–09: 185 PASS. BE08 bao gồm BE11/Sprint 1, không cộng thành số test độc lập. BE10 chưa có suite đối sánh mới. Snapshot xuất bằng git archive không có .env, dùng node_modules local qua junction, không phải cài sạch lockfile hay Supabase live.

DO04: lint FE/BE, build FE, 83+6 test BE, 149 test FE và syntax 29 file PASS. Collection QA05 JSON/event scripts parse PASS; chưa chạy trên API tích hợp.

Nhờ Hiền tạo Jira từ lỗi đã tái hiện, ghi AC, SHA, môi trường, bước, actual/expected, bằng chứng đã lọc key/token, severity, owner và hạn sửa. Đề xuất: Châu BE09/10, Hương FE07–09, Bảo FE10/DB12/data, Linh BE08/11/INT02. Không tự gửi tin, deploy hay tạo Jira trong phiên. Chỉ commit bằng danh tính Git hiện có, không co-author; chưa push/mở PR.
