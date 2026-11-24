# DO04 — CI và phương án chạy Sprint 2, 24/11/2026

PR [#28](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/28) đã có CI xanh ở revision trước và nhánh hiện đã merge `main@413a7b6`. DO04 không yêu cầu Hiền có quyền Vercel: phần tự làm là CI/gate và hướng dẫn local; deploy staging cần người có quyền hoặc PO xác nhận local fallback.

## Đã hoàn thành trong phạm vi tự động

- CI đặt cả `VITE_USE_MOCK=false` và `VITE_USE_MOCK_API=false` cho production build.
- `scripts/check-backend-syntax.mjs` kiểm tra toàn bộ backend JS thay vì chỉ ba entrypoint; sau sync main hiện có 49 file syntax PASS.
- Ứng viên tích hợp đã đạt frontend 227 tests, backend 243 tests; lint backend PASS, frontend chỉ còn 4 warning kế thừa; production build PASS và không có mock chunk.
- QA local qua API thật đạt 56/56. Không cần Vercel để tái lập bằng local backend/frontend.

Các số ứng viên QA chứng minh source ghép có thể chạy, không thay thế CI remote trên HEAD cuối của PR #28. PR #33 đang đề xuất revert toàn bộ merge INT02; DO04 không tự quyết định merge/revert và không coi một cây source khác là release đã chốt.

## Chạy local fallback

1. Checkout release SHA đã được nhóm chốt; tạo `.env` từ example, không commit secret.
2. Dùng `npm.cmd ci --prefix backend` và `npm.cmd ci --prefix frontend` nếu PowerShell chặn `npm.ps1`.
3. Chạy lint, test, `npm.cmd run build --prefix frontend`, rồi `node scripts/check-backend-syntax.mjs`.
4. Đặt `VITE_USE_MOCK=false`, `VITE_USE_MOCK_API=false`; FE trỏ đúng backend local và backend CORS chứa origin Vite thực tế.
5. Khởi động backend/frontend ở hai terminal, kiểm tra `/api/health`, `/goi-y`, `/search`, chi tiết món/công thức và Network không gọi mock.
6. Lưu SHA, lệnh, port, kết quả CI/smoke. Không ghi giá trị key vào log/report.

## Phần cần người dùng/nhóm thực hiện

- PO/INT02 chốt giữ PR #32 hay revert #33 và ghi nhận local demo thay staging.
- Reviewer duyệt PR #28; CI phải xanh trên HEAD mới sau lần push này.
- Nếu vẫn bắt buộc staging, giao cho thành viên có quyền Vercel cấu hình FE/BE/env/CORS và cung cấp URL. Hiền không bị yêu cầu tự deploy khi không có quyền.

DO04 code/gate sẵn sàng review; trạng thái release/staging vẫn phụ thuộc quyết định tích hợp và quyền hạ tầng, không phải thiếu triển khai trong nhánh DO04.
