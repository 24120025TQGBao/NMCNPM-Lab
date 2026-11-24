# FE11 — Hướng dẫn kiểm chứng và review, 24/11/2026

## Source và contract

Frontend: main23bcb17 + merge FE09 786605d + thay đổi FE11. Backend kiểm thử: origin/linh/int02 449d189, lấy qua git fetch; frontend adapter/query theo BE07 và PO72be7e1, BE12 102ce6b. Không deploy, không sửa Supabase. Pin membership dùng catalog có public recipe chứa ID, không tự đoán từ tên hay missing[]. API paging 50/trang, dừng lỗi nếu trang không tiến triển; abort khi bỏ ghim. Các component sử dụng Button/theme và các slot FE09.

## Chạy local với backend tích hợp

1. Fetch repo; checkout/worktree nhánh FE11 riêng, npm ci --prefix frontend. Backend dependencies có thể npm ci --prefix backend tại checkout main. Không thay đổi branch Hương.
2. .env backend local theo .env.example, đủ SUPABASE_URL, SUPABASE_ANON_KEY và SUPABASE_SERVICE_ROLE_KEY. Không commit/chụp/log giá trị.
3. Terminal backend QA:

```powershell
$env:QA_REPO_ROOT='D:/GitHub/NMCNPM-Lab'
$env:QA_ENV_FILE='D:/GitHub/NMCNPM-Lab/backend/.env'
node docs/fe11-preview-api.mjs
```

Script xuất đúng source INT02449d189 vào temp, dùng dependency backend từ QA_REPO_ROOT, chạy app thật sau wrapper chỉ nhận GET tại127.0.0.1:3102. Có thể dùng backend INT02 chạy bình thường thay wrapper; wrapper giúp bộ QA không ghi DB. Không import script này vào production.

4. Frontend: đặt VITE_USE_MOCK=false, VITE_USE_MOCK_API=false. Nếu dùng proxy mặc định thì chạy backend cổng3000, để VITE_API_URL trống. Nếu backend QA3102 thì tạo config Vite tạm kế thừa vite.config.js và đổi server.proxy['/api']='http://127.0.0.1:3102', host127.0.0.1, port5175; VITE_API_URL trống. Config tạm không commit. Hoặc VITE_API_URL=http://127.0.0.1:3102 và thêm origin frontend vào CORS_ORIGINS của backend thông thường. Khởi động lại Vite sau đổi env.

## Tự kiểm tra UI

1. Guest mở /goi-y?tab=nguyen-lieu. Chọn qua autocomplete: Dầu ăn5, Gia vị thông dụng6, Gừng8, Rượu trắng11, Hành lá28 (alias hanh xanh), Khổ qua55, Ngò rí57. Bấm Tìm món.
2. Món33:87% (ratio0.8667), Có7/8, thiếu Sườn heo. Section Mua thêm hiện56, unlock1, dish33. Khi API data=[] section ẩn, không báo lỗi; error có retry, kết quả món vẫn dùng được.
3. Ghim Khổ qua: nhóm Cần đi chợ ưu tiên món có55 nhưng không đổi nhóm/ratio. Bỏ ghim trả lại thứ tự API. Ghim nhiều ID là ưu tiên món chứa ít nhất1 ID. Xóa chip đã ghim thì bỏ ghim đó; back/reload giữ ghim còn hợp lệ. API pin lỗi giữ thứ tự API và có retry.
4. Tick món33, bấm Sao chép danh sách đi chợ: clipboard chỉ '- Sườn heo'. Tick nhiều món có cùng ID thiếu chỉ ghi1 lần. Chưa chọn hoặc không có thiếu thì disabled. Lỗi quyền không báo thành công; đổi danh sách bỏ feedback cũ. Món chưa đủ dữ liệu có cảnh báo phần thiếu chưa chắc đầy đủ.
5. Bấm Đã có nguyên liệu này trên gợi ý Sườn heo, rồi Tìm món: món33 thành100%,8/8. Danh sách chọn cũ được xóa khi query mới, không copy thiếu của kết quả cũ.

## Chạy suite và browser

```powershell
npm run lint --prefix frontend
npm test --prefix frontend
$env:VITE_USE_MOCK='false'
$env:VITE_USE_MOCK_API='false'
npm run build --prefix frontend
$env:QA_RESULT_FILE='fe11-int02-api-result.json'
node docs/fe11-int02-api-check.mjs
```

PowerShell chặn npm.ps1 thì dùng npm.cmd. Script API chỉ GET tới localhost3102 (đổi QA_API_BASE nếu cần), expected5 ca tính từ ingredient/role của recipe25 trước khi gọi match, không lấy match response làm expected. Không nạp fixture.

Browser runner cần package playwright-core và Chromium1255/Firefox1572 trong cache tương ứng lần kiểm tra. Cài package trong thư mục QA tạm, không thêm dependency production; đặt QA_PLAYWRIGHT trỏ package, QA_BROWSER_ROOT trỏ ms-playwright cache, QA_BASE_URL=http://127.0.0.1:5175 và QA_BROWSER_OUTPUT trỏ thư mục bằng chứng; chạy node docs/fe11-browser-check.cjs. Có QA_BROWSER_FILTER để chạy lại một cấu hình. Không tạo tài khoản/bài đăng, không ghi backend. Các lỗi HTTP mô phỏng chỉ tồn tại trong browser route của bài test.

40 API và33 browser checks là các lớp khác nhau, không cộng thành số AC. Browser viewport390×844 là mô phỏng. Chưa đánh giá mọi thiết bị hoặc full luồng FE10. Chromium dùng clipboard native, Firefox stub có kiểm soát; unit và cả3 browser đều kiểm tra nhánh từ chối quyền.
