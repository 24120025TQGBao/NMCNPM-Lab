# TV5 — Tiến độ và hướng dẫn thực hiện

Đối chiếu ngày 11/11/2026 với kế hoạch phân công ngày 05/11/2026 và code local. Sprint 1 đã qua hạn 08/11; hiện thuộc lịch Sprint 2 đề xuất. Chưa có bằng chứng Jira/PR, CI online, staging hoặc Supabase thật để kết luận task Done. Nội dung tài liệu phân công được dùng làm yêu cầu đối chiếu, không tự động gửi thông báo hay cập nhật Jira.

## Tiến độ

| Task | Hạn | Tình trạng quan sát được | Điều kiện còn thiếu để đóng |
|---|---|---|---|
| DO01 | 05/11 | Có hai `.env.example`, gitignore và README hướng dẫn chạy | Một thành viên chạy từ checkout sạch, xác nhận và PR review/merge |
| DO02 | 06/11 | Đã bổ sung `.github/workflows/ci.yml`: lint FE/BE, test FE/BE, build FE, kiểm tra cú pháp entrypoint BE | Push/PR, link CI xanh và fail có chủ đích; cấu hình required check/review |
| QA01 | 06/11 | Đã hoàn thành Test Plan và 23 Test Cases chi tiết trong [`qa01-test-cases.md`](qa01-test-cases.md) theo contract BE01 v1.0 | Sẵn sàng review / commit; chờ TV3 chốt policy email và TV1 merge BE |
| DO03 (P1) | 07/11 | BE có `index.js` export Express; có hướng dẫn deploy bên dưới | Tạo hai project, cấu hình môi trường, smoke test và link staging |
| QA02 | 08/11 sáng | Có test tự động cho health/profile và API client FE | Thiếu API posts, contract BE01, search/pagination món; chưa đối chiếu DB thật |
| QA03 | 08/11 chiều | Có quy trình và mẫu report | Thiếu luồng đăng bài/feed; chưa chạy Chrome/Firefox/mobile |
| QA04 | 14/11 | Có khung case Sprint 2 bên dưới | Chốt PO02/contract trước khi ghi kết quả |
| DO04 | 16/11 | CI cơ sở đã chuẩn bị | Bổ sung suite tính năng Sprint 2 và kiểm tra staging sau merge |
| QA05 | 20/11 | Chờ tính năng cộng đồng/quản trị | Test cả UI và gọi API trực tiếp theo ma trận vai trò |
| QA06 | 21/11 | Chờ QA05 và bản tích hợp | Hồi quy, report, retest bug |

Không dùng tỷ lệ test unit pass để suy ra tỷ lệ hoàn thành Sprint.

## Chạy kiểm tra local

Đọc README để cấu hình `.env` và chạy hai server. Trên PowerShell máy này, dùng `npm.cmd` do `npm.ps1` bị Execution Policy chặn; không cần đổi chính sách máy.

Từ thư mục gốc, trên checkout mới chạy `npm.cmd ci --prefix frontend` và `npm.cmd ci --prefix backend`, rồi:

```powershell
node frontend/node_modules/oxlint/bin/oxlint --config frontend/.oxlintrc.json frontend backend
npm.cmd test --prefix frontend
npm.cmd test --prefix backend
npm.cmd run build --prefix frontend
node --check backend/index.js
node --check backend/src/app.js
node --check backend/src/server.js
git check-ignore frontend/.env.local backend/.env
git ls-files '*env*'
```

Kỳ vọng lint/build/test exit code 0. Lệnh check-ignore phải liệt kê hai file local; danh sách tracked chỉ có template, không có `.env` thật. Backend là JavaScript chạy trực tiếp, không có bước transpile/build artifact; kiểm tra cú pháp không thay thế test runtime.

DO01: nhờ người khác làm theo README từ checkout sạch, ghi Node version, OS, commit và ảnh FE/health. Không ghi key vào bằng chứng.

DO02: tạo PR có workflow, lưu link run xanh. Trên nhánh thử riêng, thêm `test('intentional CI failure', () => { assert.fail('DO02') })` vào file test đã import test/assert, push để xác nhận job đỏ. Xóa dòng thử, push lại để CI xanh. Không merge commit thử lỗi. Đề xuất ruleset yêu cầu một approval và check `checks` thành công. Unit test dùng mock, không cần secret Supabase thật; nếu thêm integration test, đặt secret trong repository/environment settings và không chạy ghi DB từ PR không tin cậy.

## QA01 / QA02 — Test case Sprint 1

Tiền điều kiện chung: ghi commit, URL, trình duyệt, tài khoản test; có FE/BE chạy, DB staging riêng và dữ liệu món hợp lệ. Các case dưới đây là dự thảo từ kế hoạch, cần đối chiếu AC của PO. `Chưa chạy` khác `Blocked` và khác `Fail`.

| ID | Điều kiện | Bước test | Kết quả mong đợi |
|---|---|---|---|
| A01 | Email mới; biết policy DB06 | Chọn đăng ký, nhập tên/email/mật khẩu hợp lệ, submit; xác nhận email nếu bật | Tạo tài khoản; policy bật thì hướng dẫn xác nhận, tắt thì có thể đăng nhập ngay |
| A02 | Email đã đăng ký | Đăng ký lại cùng email | Không tạo tài khoản trùng; thông báo theo policy Auth/AC, không bắt buộc API tiết lộ email tồn tại |
| A03 | Form auth | Nhập `abc` ở email, submit | Chặn email sai định dạng |
| A04 | Tài khoản hợp lệ | Đăng nhập đúng email nhưng sai mật khẩu | Báo lỗi; không có phiên đăng nhập |
| A05 | Tài khoản đã xác nhận nếu cần | Đăng nhập đúng thông tin | Hiện tài khoản đúng; `/api/me` trả 200 |
| A06 | Đã đăng nhập | F5 | Phiên được khôi phục; hồ sơ đúng người |
| A07 | Đã đăng nhập | Đăng xuất, F5 | Form đăng nhập hiện lại; không còn hồ sơ người trước |
| A08 | Chưa đăng nhập; route đã được FE03 cung cấp | Truy cập `/posts/new` | Chuyển về đăng nhập; hiện tại blocked vì chưa có route |
| P01 | BE03 và Supabase đã cấu hình | POST `/api/posts` không Bearer, rồi với token sai | Mỗi request trả 401; không phát sinh bản ghi |
| P02 | Token hợp lệ; contract BE01 | POST lần lượt thiếu title, dish, ingredients, steps; quantity không phải số | 400 cho từng payload; không lưu dữ liệu dở dang |
| P03 | Token hợp lệ; ID món không tồn tại | POST payload theo BE01 | 400; không phát sinh bài/công thức con |
| P04 | Token hợp lệ; món/nguyên liệu có thật | POST bài có 2 nguyên liệu, 2 bước | 201, ID bài; người tạo lấy từ token; DB đủ quan hệ, bước đúng thứ tự |
| P05 | P04 thành công | GET danh sách rồi GET chi tiết ID mới; F5 FE | Bài còn tồn tại, đủ nguyên liệu/bước; không lộ email tác giả |
| P06 | BE04 đã có | GET chi tiết ID không tồn tại | 404 theo contract |
| P07 | Có nhiều bài | GET các trang liên tiếp theo BE01 | Mới nhất trước; đúng giới hạn; không trùng/bỏ bài với dataset cố định |
| P08 | Có môi trường DB test và cách gây lỗi đã thống nhất TV3 | Gửi bài khiến một thao tác con trong RPC thất bại | Transaction rollback toàn bộ; không còn bài/công thức mồ côi |
| F01 | Feed đã triển khai | DevTools Network throttling, tải feed | Hiện loading rồi danh sách |
| F02 | Feed đã triển khai, dữ liệu rỗng hoặc mock có kiểm soát | Tải feed | Empty state, không crash |
| F03 | Feed đã triển khai | Chặn request feed bằng DevTools rồi tải lại | Thông báo lỗi; có cách thử lại |
| D01 | Có dataset DB08 | GET `/api/dishes` không token | 200, món công khai; đối chiếu dataset thực tế |
| D02 | Có món tên chứa dấu, BE05 hoàn thiện | Tìm tên có dấu/không dấu/hoa thường theo contract | Cùng tập món phù hợp |
| D03 | BE05 hoàn thiện | Tìm chuỗi không tồn tại | 200, kết quả rỗng |
| D04 | BE05 hoàn thiện | GET `?page=0&limit=-1`, rồi `?page=abc` | 400 |
| D05 | Nhiều món; BE05 hoàn thiện | GET page 1/2 với limit nhỏ | Đúng phân trang theo contract |

Hiện có `/api/health`, `/api/dishes`, `/api/me`; **không có `/health` hay `/api/posts`**. `/api/dishes` hiện trả mảng tối đa 100 món ACTIVE, chưa xử lý search/page/limit. Đừng viết payload bài theo tên cột suy đoán: chờ `docs/api.md` và RPC DB09 từ TV1/TV3.

Smoke bằng PowerShell (server đã chạy):

```powershell
curl.exe -i http://localhost:3000/api/health
curl.exe -i http://localhost:3000/api/dishes
curl.exe -i http://localhost:3000/api/me
curl.exe -i -H "Authorization: Bearer invalid" http://localhost:3000/api/me
curl.exe -i "http://localhost:3000/api/dishes?page=0&limit=-1"
```

Health 200 + `databaseConfigured:true` chỉ xác nhận có cấu hình, không chứng minh DB kết nối được. `/me` thiếu/sai token chỉ kỳ vọng 401 khi backend đã cấu hình; chưa cấu hình thì middleware trả 503. Request phân trang sai hiện chưa được validate: ghi gap BE05, không đánh dấu pass.

Trong Postman: tạo environment local `baseUrl`, `accessToken`; không export giá trị token. Sau khi BE01 có, thêm P01–P08 với payload đúng contract và assertion status/body. Với P04/P08, dùng Supabase SQL Editor kiểm tra các bảng thực tế theo DB07/DB09: owner, số nguyên liệu/bước, khóa ngoại, không bản ghi mồ côi. Ghi ID test và thời gian; thống nhất cách dọn dữ liệu staging với TV3.

## Gap cần trao đổi với nhóm

| ID | Bằng chứng code | Ảnh hưởng | Người phối hợp |
|---|---|---|---|
| G01 | `backend/src/app.js` chưa có posts; FE chưa có form/feed | Chặn Sprint Goal S1-02/S1-03, QA02/QA03 | TV1 + TV2 + TV3 |
| G02 | Dishes route bỏ qua query; chưa có contract trong repo | BE05 chưa đáp ứng tìm kiếm/phân trang/400 | TV4 + TV1 |
| G03 | Health chỉ ở `/api/health` | Lệch đường dẫn kế hoạch BE02 | TV1 chốt contract |
| G04 | Chưa có AC và xác nhận policy DB06 trong repo | Chưa kết luận nghiệm thu auth/email | TV1 + TV3 |

Đây là phát hiện từ code, chưa phải Bug đã tạo trên Jira. Mẫu Bug: tiêu đề, Story, commit/URL, tiền điều kiện, bước tái hiện, expected/actual, mức ưu tiên đề xuất, ảnh/log đã che token, assignee, kết quả retest. G01 là blocker P0 theo Sprint Goal; các ưu tiên khác cần PO xác nhận.

## QA03 — Hồi quy và report

Chạy A01 → A05 → P04 → P05 → A06 → A07 trên Chrome, Firefox và một viewport mobile (ví dụ 390×844). Nếu chỉ dùng giả lập, ghi rõ không phải thiết bị thật. Kiểm tra form không tràn ngang, nút bấm được và lỗi dễ đọc. Mỗi môi trường cần kết quả riêng, ảnh/video và commit.

Report mẫu: ngày/commit/URL; môi trường; tổng case; Pass/Fail/Blocked/Not run; link bug; S1-01/S1-02/S1-03 đạt hay chưa cùng lý do; người test/review. Chỉ kết luận Story đạt khi đủ AC và có bằng chứng tích hợp.

## Sprint 2 và các Sprint tiếp theo

QA04: trước 14/11 chốt ma trận guest/user A/user B/admin, dataset bài công khai/ẩn và AC PO02. Dự thảo case:

| ID | Điều kiện và thao tác | Kỳ vọng cần PO xác nhận |
|---|---|---|
| S2-01 | Guest gọi endpoint tương tác cần đăng nhập | 401; không ghi DB |
| S2-02 | User gọi API quản trị trực tiếp | 403; không thay đổi bài |
| S2-03 | User A sửa/xóa tài nguyên riêng của B nếu có chức năng | Bị từ chối theo contract, dữ liệu B nguyên vẹn |
| S2-04 | Admin ẩn bài, guest tải lại feed và gọi detail | Bài không còn truy cập công khai theo policy |
| S2-05 | User tương tác hợp lệ, thao tác lặp và gửi input sai | Kết quả/số lượng đúng AC, không tạo dữ liệu trùng ngoài thiết kế |
| S2-06 | Tìm món theo tên + loại, rỗng, query sai, phân trang | Status và dữ liệu đúng contract |
| S2-07 | Xem công thức tồn tại/không tồn tại | Đủ nguyên liệu/bước đúng thứ tự; 404 khi không có |

DO04: chạy lại pipeline trên bản tích hợp Sprint 2, thêm test mới khi API sẵn sàng, xác nhận CORS/Auth trên staging. QA05: thực hiện S2-01–07 trên API và UI, lưu evidence và retest bug. QA06: chạy lại toàn bộ flow Sprint 1 + Sprint 2 trên ma trận trình duyệt, lập report trước 21/11. Chưa chạy các case này vì tính năng/AC chưa có trong checkout.

Các mốc sau là đề xuất trong kế hoạch: QA07 (25/11) lập case gợi ý, QA08 (04/12) test nguyên liệu rỗng/không khớp/dị ứng/xếp hạng theo AC, QA09 (05/12) hồi quy; QA10 (09/12) lập case quán/chủ sở hữu, DO05 (17/12) deploy cuối sau nghiệm thu, QA11 (18/12) hồi quy toàn hệ thống, DOC02 (19/12) hướng dẫn sử dụng + report. Chưa đủ yêu cầu để xác nhận triển khai hoặc nghiệm thu các task này.

## DO03 — Deploy nếu cần môi trường chung

DO03 là P1: local demo vẫn là phương án trong kế hoạch. Deploy bản hiện tại chỉ phục vụ auth/danh sách món, không làm Sprint Goal tự động đạt.

1. Import cùng repo thành hai Vercel project. Backend: Root Directory `backend`, framework Express, entrypoint `index.js` đã export app. Giữ build mặc định cho Express, không đặt `npm run build` vì backend chưa có script đó. Node 24.x.
2. Backend environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN` = origin FE HTTPS chính xác, không slash cuối. Nếu chưa biết URL FE, tạo project FE để lấy domain rồi cập nhật BE và redeploy.
3. Frontend: Root Directory `frontend`, Vite, build `npm run build`, output `dist`, Node 24.x. Đặt `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL` = origin BE HTTPS **không thêm `/api`**.
4. Chọn đúng scope Preview/Production của môi trường cần test. Frontend nhúng env lúc build nên đổi env phải redeploy. Không đưa service role vào biến `VITE_`.
5. Trong Supabase Auth cấu hình Site URL và allowed redirect URL khớp FE; giữ policy xác nhận email do TV3 quyết định. Backend hiện chỉ cho một origin qua `FRONTEND_ORIGIN`: URL preview khác sẽ cần cấu hình staging riêng hoặc điều chỉnh CORS có kiểm soát.
6. Smoke: BE `/api/health` 200; `/api/dishes` lấy được DB; `/api/me` thiếu/sai token 401 khi cấu hình đúng. Tại FE kiểm tra Network request đi đúng BE, không lỗi CORS; đăng ký/xác nhận/đăng nhập/F5/đăng xuất. Lưu URL và commit. Có health xanh nhưng dishes lỗi thì chưa đạt.
7. Nếu lỗi deploy, lưu log đã che thông tin nhạy cảm; sửa rồi redeploy hoặc ghi rõ dùng local demo. Khi rollback về deployment trước cần test lại và lưu commit; rollback code không rollback DB.

Chưa triển khai lên tài khoản Vercel hay thay đổi Supabase từ phiên làm việc này.

Nguồn chính thức kiểm tra khi viết hướng dẫn: [Express trên Vercel](https://vercel.com/docs/frameworks/backend/express), [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite), [quản lý biến môi trường](https://vercel.com/docs/environment-variables/managing-environment-variables).
