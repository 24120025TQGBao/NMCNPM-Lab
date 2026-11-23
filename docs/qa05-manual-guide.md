# QA05 — API, bằng chứng và hướng dẫn thủ công

Collection qa05-sprint2.postman_collection.json có 35 GET công khai, kiểm tra 200/400/404/rỗng, exclude, tag, autocomplete/alias, món/công thức và 5 ca tính tay. Nguồn BE07 5aae4f6, DB12 23b78ef; không gọi BE12 vì ngoài Sprint 2. JSON và toàn bộ event script parse PASS; CHƯA chạy collection trên API tích hợp.

## Chuẩn bị

1. INT02 ghép BE08/09/10/11, FE07–10 và DB12, giữ /api/me cùng chức năng/test Sprint 1. FE10 hiện còn placeholder nên chưa nghiệm thu UI.
2. TV3 áp dụng migration còn thiếu trên DB QA theo docs/dish-matching-handoff.md nhánh db. Kiểm tra quyền RPC anon/service_role và tag/role/pantry. Không chạy fixture lên DB dùng chung.
3. BE .env theo .env.example; FE VITE_API_URL là origin BE, không thêm /api; VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY theo .env.example. Đặt cả VITE_USE_MOCK=false và VITE_USE_MOCK_API=false. Khởi động lại sau đổi biến, không đưa key vào ảnh/log.
4. Hai terminal npm run dev --prefix backend và npm run dev --prefix frontend (PowerShell có thể cần npm.cmd). DevTools xác nhận Network đi BE thật, CORS origin đúng. Ghi SHA FE/BE/DB và môi trường.

## Dataset và oracle độc lập

1. TV3 tạo DB QA riêng và món Trứng cà chua COMPLETE với đúng 4 dòng: trứng/cà chua PRIMARY (weight 2), muối/dầu SECONDARY (weight 1), đủ bước và thời gian; muối/dầu có cờ basic pantry. Không thêm công thức tốt hơn cho món (RPC chọn công thức tốt nhất).
2. Điền biến eggId/tomatoId/saltId/oilId/sampleDishId bằng ID thật; không dùng ID seed cũ sau gộp từ điển.
3. pantry=false: trứng ratio 0.3333, có 1/4, thiếu 3 NEED_SHOPPING; thêm cà chua 0.6667, 2/4, thiếu 2; thêm muối 0.8333, 3/4, thiếu 1; cả bốn 1, 4/4 READY. Ca 5 trứng+cà chua, pantry=true: 1, 4/4 READY. Hai ca thiếu 1–2 có readiness MISSING_1_2.
4. Cung cấp dishId/recipeId công khai; phoId khớp “pho bo”; springOnionId khớp “hành xanh”; hiddenDishId; noRecipeDishId; missingId nguyên dương không tồn tại trong cả món/công thức. allDishIds là CSV toàn bộ ID món ACTIVE, không chỉ một trang.
5. Thiếu fixture chuẩn thì ghi BLOCKED và nhờ TV3 chuẩn bị; không lấy response làm expected. HTTP tập rỗng phải 400 dù RPC [] hợp lệ. INCOMPLETE 100% vẫn nhóm 4.

## Chạy Postman

1. Import collection cùng thư mục, sửa collection variables từ dataset, baseUrl=http://localhost:3000/api hoặc https://<BE>/api, không slash cuối. Không thêm Authorization.
2. Collection Runner chạy toàn bộ. Biến SET_ phải cấu hình trước, không bỏ assertion để có pass. Lưu tổng request/assertion pass/fail, SHA, người chạy và môi trường.
3. Nếu đã cài Newman: newman run docs/qa05-sprint2.postman_collection.json --reporters cli,json --reporter-json-export qa05-result.json. Chạy bản collection đã điền biến hoặc truyền environment phù hợp. Không commit key/token/cookie trong file kết quả.
4. Match 200 rỗng: trên DB QA riêng không có món khả kiến nhưng vẫn có ID nguyên liệu hợp lệ, gọi /api/dishes/match?ingredients=<id>&pantry=false, kỳ vọng data=[]. Nhờ TV3 chuẩn bị; ID không tồn tại phải 400, không phải rỗng.
5. Gọi match với ID nguyên liệu chắc chắn không tồn tại → 400 VALIDATION_ERROR. Gây 500 bằng giả lập ở local QA, kiểm tra INTERNAL_ERROR và không SQL/stack; không phá quyền DB chung để gây lỗi.

## UI và Jira

1. Dùng bảng 49 case QA04 từ nhánh hien/QA04. Chromium + Firefox desktop; thêm 390×844, ghi rõ mô phỏng hay máy thật. Mỗi case có actual/status/evidence/SHA/runner/bug.
2. Gợi ý → Gợi ý khác không lặp → Nấu món này → chi tiết → Tự nấu → danh sách công thức → chọn → back giữ trạng thái. Theo nguyên liệu → autocomplete/chip → pantry → đủ 4 nhóm, kể cả INCOMPLETE → món → công thức → back. Tìm không dấu/lọc AND/phân trang. FE10 placeholder hiện đánh BLOCKED.
3. Lỗi tái hiện: bạn tạo Jira Bug với AC, SHA, môi trường, từng bước, request đã lọc key, actual/expected, ảnh, severity và owner đề xuất. P0 phải có owner/hạn sửa do nhóm xác nhận. Chưa tạo Jira trong phiên.
4. Nhập kết quả QA06, nhờ PO duyệt QA04 và INT02 xác nhận luồng thật; không kết luận đạt từ mock.

## Kiểm chứng local đã chạy

Source git archive không có .env, dùng node_modules local qua junction; không phải npm ci sạch hoặc Supabase live.

| Nhánh | Vitest | Node | Kết quả |
|---|---:|---:|---|
| BE08 5e0887b | 163 | 6 | PASS |
| BE11 5567501 | 111 | 6 | PASS |
| BE10 0a5a8b3 gồm BE09 | 50 | 6 | PASS |
| FE07–09 786605d | 185 | — | PASS |

Không cộng các suite chồng lắp thành số test độc lập. BE10 hiện chỉ có posts/scaffold và test tìm món cũ; chưa có test mới chứng minh match/400/404 chi tiết. Tab FE mới mặc định mock nếu thiếu VITE_USE_MOCK_API=false.

### BUG-S2-001 — /api/me mất trên BE10

Đã tái hiện Supertest, không gọi DB/key: main 23bcb17 GET /api/me guest → 401 UNAUTHORIZED; BE10 0a5a8b3 → 404 NOT_FOUND. Expected giữ route/auth của main, actual routes/index.js bỏ route. Châu/INT02 nhận xử lý khi tích hợp, severity/hạn sửa cần nhóm xác nhận. Jira: CHƯA TẠO.

Tái lập với hai checkout đã cài dependencies:

```powershell
node docs/qa05-route-regression.mjs <duong-dan-main> <duong-dan-be10>
```

Script đã chạy và fail đúng assertion 404 khác 401. Sau sửa phải pass. Không sửa nhánh thành viên trong task QA. Rà code cũng thấy nhánh BE09/BE10 bỏ test/chức năng main, BE10 chưa mount suggestions/ingredients; các phần này cần retest trên bản ghép.
