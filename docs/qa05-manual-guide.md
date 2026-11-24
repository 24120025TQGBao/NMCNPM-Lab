# QA05 — Đã thực hiện và các bước còn lại, 24/11/2026

PR [#29](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/29) vẫn draft vì chưa có full AC/FE10/bản main cuối. Không còn dùng kết luận lỗi route trên preview cũ làm hiện trạng INT02 mới.

## Đã tự thực hiện

| Phần | Bằng chứng | Kết quả |
|---|---|---|
| API qua app/route thật INT02449d189 + Supabase | qa05-int02-retest-2026-11-24.json, runner qa05-int02-api-check.mjs |40/40 PASS |
|5 ca đối chiếu độc lập món33/recipe25 | oracle trong JSON trên; weight PRIMARY:SECONDARY=2:1 |5/5, đã nằm trong40, không cộng thêm |
| Browser guest hai tab trên FE09 | qa05-browser-evidence/latest-results.json | Chromium/Firefox desktop +390×844,36/36 smoke PASS |
| Browser FE11 đã nối FE09 và INT02 | nhánh hien/FE11: docs/fe11-browser-evidence/results.json |33/33 PASS; đủ Mua thêm/ghim/copy/[]/retry/session |
| Collection Postman | qa05-sprint2.postman_collection.json |41 GET; JSON và scripts parse PASS, chưa chạy đủ collection với fixture riêng |

Retest hai lỗi cũ trên INT02 mới: BUG-S2-001 /api/me guest401 UNAUTHORIZED; BUG-S2-002 /api/dishes/33/recipes200 với recipe25. Đã đạt trên449d189; main23bcb17 chưa merge nên không tự tuyên bố main đã được sửa. Chưa tạo/gán/đóng Jira thay nhóm.

Năm oracle đã chạy không cần bạn nạp fixture: recipe25 của món33 có đúng8 ID `5,6,8,11,28,55,57,56`, tổng weight15. pantry=false, chọn1/2/4/7/8 loại cho ratio0.0667/0.2/0.4667/0.8667/1, missing7/6/4/1/0, count1/2/4/7/8 trên8. Expected tính từ ingredient/role của recipe trước khi gọi match, không lấy match response làm expected. Dataset đổi hoặc món có nhiều recipe thì phải xác minh lại fixture.

Các file qa05-live-preview-result.json và bảng trong report23/11 là lịch sử source BE10 cũ:37pass/1fail, không phải trạng thái mới. Giữ chúng để tái lập quá trình sửa; không mở bug mới chỉ vì runner source cũ vẫn fail.

## Có thể chạy lại tự động

1. Fetch origin, dùng backend nhánh origin/linh/int02 tại449d189 hoặc bản mới đã được nhóm thống nhất. Không merge nguyên nhánh BE09/BE10 cũ làm mất /me. Backend .env local theo .env.example, không commit key.
2. npm ci --prefix backend, npm run dev --prefix backend ở worktree backend tích hợp; cổng mặc định3000. Có thể dùng GET-only wrapper docs/fe11-preview-api.mjs trên nhánh FE11 để chạy cổng3102; wrapper lấy đúng source INT02 và không nhận thao tác ghi.
3. Tại checkout QA05:

```powershell
$env:QA_API_BASE='http://localhost:3000'
$env:QA_RESULT_FILE='qa05-int02-retest-result.json'
node docs/qa05-int02-api-check.mjs
```

Script chỉ GET HTTP tới backend, không cần key trên command line, không nạp fixture/DDL. File JSON không ghi credential/body lỗi DB. Exit khác0 nếu có fail/blocked, cần phân biệt lỗi môi trường với bug sản phẩm. PowerShell chặn npm.ps1 thì dùng npm.cmd.

4. Frontend bản cần nghiệm thu: đặt VITE_USE_MOCK=false và VITE_USE_MOCK_API=false, VITE_API_URL trống nếu dùng Vite proxy tới backend3000; hoặc trỏ đúng origin BE và cấu hình CORS_ORIGINS. Khởi động lại sau đổi env. Network phải gọi backend thật. Bạn không cần quyền Vercel: dùng môi trường local chung theo DO04.

## Phần bạn/nhóm còn cần thực hiện để QA05 Done

1. **Bản tích hợp cuối và FE10:** INT02 ghép các PR được duyệt, hoàn thiện SearchPage/DishDetailPage/RecipeDetailPage. Hiện FE10 còn placeholder; chưa thể kết luận luồng đến công thức đạt. Ghi SHA FE/BE/DB cuối, môi trường và người chạy, retest hai lỗi route trên đúng bản cuối.
2. **Chạy đủ QA04:** lấy49 AC mới theo PO72be7e1 từ nhánh QA04, ghi từng actual/status/evidence/bug. Smoke36 và FE11browser33 không thay toàn bộ49 AC. P0 còn gồm loading/500/retry/exhaustion, ẩn tài nguyên, recipe thiếu dữ liệu, phân trang/back và nhiều điều kiện khác.
3. **Dữ liệu kiểm soát:** TV3/DA04 chuẩn bị tag, pantry và công thức COMPLETE/INCOMPLETE100%/hidden/no-recipe trên DB QA riêng. Xác minh đúng cờ/role/ID trước chạy. Tag/pantry chưa có dữ liệu thì ghi BLOCKED theo dataset, không sửa expected; không nạp fixture lên Supabase chung hoặc đánh COMPLETE hàng loạt.
4. **Scope mới của PO:** lọc loại món/khẩu vị và tìm nguyên liệu theo từ giữa tên DEFERRED Sprint3; không ghi thiếu các phần đó thành bug P0. Thời gian chế biến vẫn thuộc S2-03.2 P0. servings=null hiển thị chưa có thông tin là thiết kế Sprint2.
5. **Collection và fixture riêng:** chạy đầy đủ41 request bằng Postman Runner như dưới, lưu run. Các oracle fixture trứng của collection khác với5 oracle live món33 đã đạt; không tự đánh pass fixture chưa được chuẩn bị.
6. **UI và review:** Chromium + Firefox desktop, thêm390×844 (ghi mô phỏng hay máy thật); Gợi ý→Gợi ý khác→Nấu món này→chi tiết→Tự nấu→danh sách→công thức→back; Nguyên liệu→kết quả4 nhóm→món→công thức→back; tìm/giới hạn thời gian/phân trang. Lặp vùng ảnh hưởng trên SHA sửa, không cần chạy lại vô ích mọi suite khi source không đổi.
7. **Jira/QA06:** lỗi tái hiện phải có AC, SHA, môi trường, điều kiện, từng bước, actual/expected, ảnh/request đã lọc key, severity/owner/hạn. Nhóm xác nhận P0 và người nhận; không coi đã giao bug khi chỉ có ID local. Nhập kết quả QA06, PO review QA04 và INT02 xác nhận luồng thật.

## Postman từng bước

1. Import qa05-sprint2.postman_collection.json; baseUrl gồm /api, không slash cuối (ví dụ http://localhost:3000/api). Không thêm Authorization.
2. Biến public dataset: dishId/recipeId, phoId, springOnionId, hiddenDishId, noRecipeDishId; missingId nguyên dương không tồn tại ở cả món/công thức; allDishIds là CSV toàn bộ món ACTIVE, không chỉ một trang.
3. Fixture QA riêng của collection: món Trứng cà chua COMPLETE, đúng4 loại (trứng/cà chua PRIMARY=2, muối/dầu SECONDARY=1), đủ bước/thời gian; muối/dầu basic pantry=true. Điền eggId/tomatoId/saltId/oilId/sampleDishId bằng ID chuẩn sau gộp từ điển. Không thêm recipe tốt hơn cho cùng món. pantry=false cho4 ca đầu; ca5 pantry=true. Thiếu fixture thì BLOCKED, không lấy API match làm expected.
4. emptySuggestIds là bộ ID hợp lệ đã xác định không có món COMPLETE thiếu đúng1. [] từ BE12 là hợp lệ, không phải lỗi. Bộ7 `5,6,8,11,28,55,57` là ca dương mở món33 qua56 Sườn heo, không dùng nó để kỳ vọng rỗng.
5. Runner chạy toàn bộ, biến SET_ phải cấu hình trước, không bỏ assertion để có pass. Nếu dùng Newman đã cài: `newman run docs/qa05-sprint2.postman_collection.json --reporters cli,json --reporter-json-export qa05-result.json` với collection/environment đã điền biến.
6. Match200 rỗng cần DB QA không có món khả kiến nhưng có ID nguyên liệu hợp lệ; ID không tồn tại phải400. Test500 bằng giả lập tại local QA, không phá quyền DB chung. Dữ liệu thiếu định lượng không tự thay0; INCOMPLETE100% vẫn nhóm4.
7. Lưu tổng request/assertion pass/fail và SHA/runner. Lọc Authorization/apikey/token/cookie trước chia sẻ; không commit .env hoặc secret.
