# QA05 — API, bằng chứng và hướng dẫn thủ công

**Cập nhật 24/11:** đã có origin/linh/int02449d189 trên remote. Retest API thật qua route wiring của nhánh này đạt40/40, hai BUG-S2-001 (/me) và BUG-S2-002 (recipes-list) không còn tái hiện trên INT02 mới. Xem qa05-int02-retest-2026-11-24.json. Bằng chứng37/1 bên dưới là lịch sử của source cũ, không phải trạng thái INT02 hiện tại. FE11 đã nối FE09 trên nhánh riêng và browser33/33 đạt; vẫn còn FE10/full AC/bản main cuối để QA05 nghiệm thu.

**Cập nhật xuất bản 23/11:** đã commit/push `hien/QA05` bằng danh tính Git hiện tại, không co-author. [PR #29](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/29) đã mở; [CI pull_request xanh](https://github.com/24120025TQGBao/NMCNPM-Lab/actions/runs/45198165370) tại SHA `90b63b7`. PR draft: còn lỗi route, FE10, INT02, full AC/collection và Jira như hướng dẫn bên dưới.

Collection qa05-sprint2.postman_collection.json có 41 GET công khai, kiểm tra 200/400/404/rỗng, exclude, tag, autocomplete/alias, món/công thức và 5 ca tính tay. Nguồn PO/BE07 a68473d, DB12 23b78ef, BE12 102ce6b và BE10 Q4 dfd7ba2; BE12/FE11 vẫn P1 Sprint 2. JSON và event script parse PASS. Collection Postman đầy đủ chưa chạy; runner API preview riêng đã chạy live, xem mục cập nhật cuối.

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

Không cộng các suite chồng lắp thành số test độc lập. Bảng ở trên là lần chạy ban đầu trên BE10 cũ; nhánh Q4 mới đã có 19 test đối sánh, xem cập nhật bên dưới. Tab FE mới mặc định mock nếu thiếu VITE_USE_MOCK_API=false.

### BUG-S2-001 — /api/me mất trên BE10

Đã tái hiện Supertest, không gọi DB/key: main 23bcb17 GET /api/me guest → 401 UNAUTHORIZED; BE10 0a5a8b3 → 404 NOT_FOUND. Expected giữ route/auth của main, actual routes/index.js bỏ route. Châu/INT02 nhận xử lý khi tích hợp, severity/hạn sửa cần nhóm xác nhận. Jira: CHƯA TẠO.

Tái lập với hai checkout đã cài dependencies:

```powershell
node docs/qa05-route-regression.mjs <duong-dan-main> <duong-dan-be10>
```

Script đã chạy và fail đúng assertion 404 khác 401. Sau sửa phải pass. Không sửa nhánh thành viên trong task QA. Rà code cũng thấy nhánh BE09/BE10 bỏ test/chức năng main, BE10 chưa mount suggestions/ingredients; các phần này cần retest trên bản ghép.

## Cập nhật sau fetch mới — phần đã tự làm thêm

- Main vẫn23bcb17; merge origin/main vào nhánh QA05 đã up-to-date. BE12 102ce6b có34 test mới; suite toàn nhánh214 Vitest+6 Node PASS. Q4 dfd7ba2 có19 test đối sánh; toàn nhánh69+6 PASS.
- Collection hiện41 GET, thêm BE12 validation/mẫu mở khóa/đủ bộ/rỗng. Không assert ratio giảm toàn cục: RPC ưu tiên COMPLETE trước INCOMPLETE. Biến emptySuggestIds phải lấy từ ca đã biết không có món thiếu đúng1; không tự giả định mọi bộ phổ biến đều rỗng.
- Runner qa05-preview-api.mjs đã chạy với Supabase thật:37 PASS,1 FAIL,0 BLOCKED. Có5 ca độc lập món33/công thức25 và BE12 mua Sườn heo PASS. File qa05-live-preview-result.json chỉ chứa trạng thái và oracle công khai, không key/token.
- Runner tạo snapshot source từ commit đã pin và ghép router tường minh, chỉ nhận GET. Đây là bản preview phục vụ QA, không sửa nhánh thành viên, không chứng nhận routes/index.js hoặc INT02 đã xong. Chỉ dùng RPC match/search/get đọc dữ liệu; không signup/insert/DDL.
- Lần đầu trong sandbox không truy cập được DB; kết quả đã được chạy lại ngoài sandbox có mạng. Chỉ dùng kết quả live sau cùng để báo API, không coi lỗi mạng ban đầu là bug sản phẩm.

### Chạy lại API preview tự động (PowerShell)

Chuẩn bị npm ci --prefix backend ở checkout main, và .env local đúng quyền. Source refs đã pin trong script; cần git fetch trước. Không dán giá trị key lên terminal/chat.

```powershell
$env:QA_REPO_ROOT='D:/GitHub/NMCNPM-Lab'
$env:QA_ENV_FILE='D:/GitHub/NMCNPM-Lab/backend/.env'
$env:QA_RESULT_FILE='qa05-live-preview-result.json'
node docs/qa05-preview-api.mjs
```

Script cố ý exit1 nếu còn lỗi contract; hiện route recipes-list thiếu nên chưa xanh. Oracle không lấy expected từ matcher: đọc recipe25, xác minh món33 chỉ một công thức, tính weight PRIMARY:SECONDARY=2:1 và số thiếu trước khi gọi5 bộ. Pantry=false,8 nguyên liệu `5,6,8,11,28,55,57,56`; weight15; ratio0.0667/0.2/0.4667/0.8667/1, count1/2/4/7/8. Không cần bạn nạp fixture hay tính lại5 ca này, trừ khi dataset/source thay đổi.

### BUG-S2-002 — Thiếu route danh sách công thức

GET /api/dishes/33/recipes trên preview source BE10 Q4 dfd7ba2 →404 NOT_FOUND, expected200 data:[RecipeSummary] theo contract7.6. Chi tiết món33 và recipe25 đều200. Đề xuất Châu/INT02 thêm route giữ quyền công khai/ACTIVE, pagination và404 món không tồn tại; QA retest sau sửa. Jira CHƯA TẠO, severity/owner/hạn cần nhóm xác nhận.

### Browser smoke có thể chạy lại

Script qa05-browser-smoke.cjs chỉ guest GET, không đăng ký hoặc ghi dữ liệu. Cần playwright-core trong thư mục QA tạm và browser cache tương thích (lần chạy này Chromium1255/Firefox1572).

1. Terminal BE: cấu hình QA_REPO_ROOT/QA_ENV_FILE như trên; chạy `node docs/qa05-preview-api.mjs --serve` (localhost3102).
2. Checkout FE09 riêng đã cài dependencies. Tạo config QA tạm kế thừa vite.config.js, override server.proxy['/api']='http://127.0.0.1:3102', host127.0.0.1, port5175. Đặt VITE_USE_MOCK=false, VITE_USE_MOCK_API=false, VITE_API_URL='' rồi khởi động Vite bằng config đó. Không sửa/commit config tạm lên nhánh Hương.
3. Đặt QA_PLAYWRIGHT=đường dẫn package playwright-core, QA_BROWSER_ROOT=thư mục ms-playwright, QA_BASE_URL=http://127.0.0.1:5175, QA_BROWSER_OUTPUT=thư mục bằng chứng. Chạy `node docs/qa05-browser-smoke.cjs`.
4. File results.json và ảnh chỉ UI công khai. Kiểm tra trước chia sẻ. Script xác nhận placeholder FE10 và back; không đánh bước placeholder là hoàn thành luồng đến công thức.

### Bạn còn cần làm để task Done

1. PO review QA04; INT02 merge các nhánh vào bản chung và giữ /api/me. Sửa BUG-S2-002, giữ regression BUG-S2-001; bạn tạo/gán Jira và xác nhận owner/hạn, retest đúng SHA sửa.
2. Sau FE10 xong, chạy trọn49 AC QA04 trên bản tích hợp, bao gồm tìm/lọc/phân trang, Tự nấu→danh sách→công thức và back. Smoke preview không thay full matrix.
3. Xác minh controlled data cho đủ4 nhóm, INCOMPLETE100%, tagAND, pantry bật/tắt thực sự đổi kết quả; nếu dataset chưa gán cờ thì BLOCKED phụ thuộc TV3/DA04, không sửa expected cho vừa dữ liệu.
4. Chạy collection41 request với biến chuẩn và lưu run, gồm hidden-resource/no-recipe/emptySuggestIds từ dataset QA. Ca fixture trứng trong collection vẫn cần TV3 chuẩn bị;5 oracle live món33 đã có chứng cứ độc lập nhưng không tự biến fixture trứng thành PASS.
5. Ghi browser/mobile actual và kết quả vào QA06; PO/INT02 xác nhận. Không cần tự có quyền Vercel: demo local theo DO04.

### Kết quả browser đã tự chạy thêm

Chromium desktop1440×1000, Firefox desktop1440×1000 và Chromium390×844:12 smoke checks mỗi cấu hình, tổng36 PASS,0 FAIL sau retest Firefox ngoài sandbox. Lần Firefox khởi chạy trong sandbox thất bại là lỗi môi trường, giữ results ban đầu và firefox-retest; tổng hợp cuối trong qa05-browser-evidence/latest-results.json.

Đã bấm UI thật: guest có gợi ý, next không lặp, xem thẻ trước, đi placeholder FE10 và back giữ thẻ; chặn0 nguyên liệu/free text; autocomplete/alias chọn7 ID; món33 87%/7of8 thiếu Sườn heo; thêm56 thành100%/8of8; chuyển tab/back giữ kết quả; không tràn ngang390px. Có ảnh7/8 trong thư mục bằng chứng. Ảnh mobile8 cho thấy đủ4 nhóm trên bộ dữ liệu này; kiểm tra ảnh là quan sát phụ, chưa bao phủ mọi điều kiện nhóm. Chưa đánh giá tải toàn bộ ảnh món hoặc toàn bộ49 AC, chưa hoàn tất recipe flow do FE10.

Bạn không cần chạy lại smoke2 trình duyệt/mobile trên cùng SHA chỉ để có bằng chứng lần đầu; cần chạy lại trên SHA tích hợp/sửa lỗi cuối và các case còn thiếu đã liệt kê.

Retest BUG-S2-001 trên dfd7ba2: script Supertest vẫn fail đúng assertion, main401 UNAUTHORIZED / bảnQ4 mới404 NOT_FOUND. Q4 chưa khôi phục /api/me; đây là lỗi còn mở trên source mới, không chỉ rủi ro từ nhánh cũ.
