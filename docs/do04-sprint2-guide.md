# DO04 — CI và staging Sprint 2

**Cập nhật xuất bản 23/11:** đã commit/push `hien/DO04` bằng danh tính Git hiện tại, không co-author. [PR #28](https://github.com/24120025TQGBao/NMCNPM-Lab/pull/28) đã mở; [CI pull_request xanh](https://github.com/24120025TQGBao/NMCNPM-Lab/actions/runs/45198155342) tại SHA `a5135b3`. Còn reviewer duyệt và PO/INT02 xác nhận demo local; không yêu cầu Hiền deploy Vercel.

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

## Cập nhật theo quyền hiện tại của Hiền và lần fetch mới

Main23bcb17 vẫn không đổi; nhánhDO04 đã merge origin/main, up-to-date. Bạn đã xác nhận không có quyền Vercel: không yêu cầu bạn tự deploy. Phương án thực hiện là demo local theo fallback DO04, dùng backend/FE tích hợp từ INT02; nhờ PO/INT02 ghi nhận lựa chọn. Staging chưa có, không ghi đã đạt AC staging.

Đã chạy preview localhost BE3102/FE5175 chỉ đọc +Supabase thật để giảm phần thủ công QA05: API37pass/1fail (recipes-list404); browser Chromium/Firefox/mobile smoke36pass. Đây là bằng chứng local preview, chưa là bản tích hợp cuối. Khi INT02 có bản chung, smoke lại đúng SHA đó và lưu lệnh khởi động/dataset/link report. Không cần xin quyền Vercel để chạy local.

Đã push nhánh, mở PR28 và có CI pull_request xanh như đầu tài liệu. Phần còn lại DO04: nhờ reviewer duyệt; bạn ghi trong ticket không có quyền Vercel, dùng demo local và nhờ PO xác nhận. Nếu nhóm vẫn muốn staging thì người có quyền Vercel nhận việc, không chặn bạn chuẩn bị local. Các thao tác publish/deploy chưa thực hiện.
