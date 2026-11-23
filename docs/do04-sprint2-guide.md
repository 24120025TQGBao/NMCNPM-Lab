# DO04 — CI và staging Sprint 2

Main đã có lint/test FE+BE và build FE. Thay đổi: đặt cả VITE_USE_MOCK=false và VITE_USE_MOCK_API=false; thay kiểm tra ba entrypoint bằng node scripts/check-backend-syntax.mjs cho toàn bộ JS backend/src, backend/tests, index.js và eslint.config.js. BE là JS ESM, không có bước biên dịch; syntax check là build check phù hợp. Script không import app, không đọc .env hoặc gọi DB. CI unit dùng mock, không chứng minh live integration.

## Chạy lại local

1. Cài Node phù hợp lockfile (máy đã chạy Node 24.11.1; jsdom có cảnh báo engine, nên dùng Node 24 mới tương thích). npm ci --prefix backend và npm ci --prefix frontend.
2. npm run lint --prefix backend; npm run lint --prefix frontend.
3. npm test --prefix backend; npm test --prefix frontend.
4. npm run build --prefix frontend; node scripts/check-backend-syntax.mjs.
5. Trên PowerShell chặn npm.ps1, dùng npm.cmd. Push PR khi sẵn sàng và lưu URL Actions run xanh đúng SHA cuối; local pass không thay remote CI.

## Staging và fallback

Chưa có session Vercel được xác thực hoặc link staging trong phiên; chưa deploy, chưa kết luận Vercel không khả thi. Local chỉ là phương án demo tạm sau INT02, cần PO xác nhận.

1. Dùng Vercel của nhóm, cấu hình project BE với source backend và entrypoint backend/index.js, đối chiếu backend/README.md; Node tương thích package. Đặt SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY qua dashboard; không đưa service_role vào FE/repo/log.
2. Deploy SHA đã tích hợp, gọi GET /health hoặc /api/health, chạy collection QA05 với baseUrl=https://<BE>/api.
3. Project FE root frontend, build npm run build, output dist, SPA rewrite từ frontend/vercel.json. Đặt VITE_API_URL=https://<BE> (không thêm /api, không slash cuối), VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY theo .env.example, cả VITE_USE_MOCK=false và VITE_USE_MOCK_API=false. Build lại sau đổi biến.
4. BE CORS_ORIGINS chứa origin FE và preview cần dùng, phân cách dấu phẩy, không path/trailing slash; redeploy sau đổi env.
5. Sau FE10 sẵn sàng, mở trực tiếp /goi-y, /search, /dishes/<id>; xác minh guest dùng được, Network gọi API thật, không CORS/mixed content. Lưu link FE/BE, SHA, CI run và smoke, chỉ ghi tên biến, không giá trị secret.
6. Nếu deploy thất bại, ghi nguyên nhân thực tế/log đã lọc secret, bạn báo PO và thống nhất demo local. Không ghi đã báo PO hoặc staging không khả thi khi chưa thực hiện.
7. Local: cấu hình .env từ .env.example tại máy; hai terminal npm run dev --prefix backend/frontend. FE VITE_API_URL trỏ origin BE, CORS chứa origin Vite thực tế. Không commit .env. Ghi rõ demo local dùng API thật hay mock.

PO02 mới nhất chưa chốt lại hạn Sprint 2. Mốc báo trước 17/11 trong mô tả cũ đã qua, cần người dùng thống nhất hạn mới với PO.

## Kiểm chứng đã thực hiện

Lint FE/BE PASS, build FE với cả hai cờ mock false PASS, BE 83 Vitest + 6 Node PASS, FE 149 PASS, syntax 29 file PASS. Bản sao tạm có JS sai cú pháp khiến gate trả nonzero như mong đợi. Dùng node_modules local qua junction; chưa cài sạch lockfile, chưa có CI remote hoặc staging run cho commit mới.
