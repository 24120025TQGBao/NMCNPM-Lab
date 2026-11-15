# Kiểm thử tiếp nối Sprint 1 — 15/11/2026

## Kết luận sau lần chạy E2E bổ sung

**Cập nhật theo xác nhận mới của người dùng:** đăng ký công khai đã được người dùng test thành công; rate limit quan sát trong lần chạy tự động không còn là blocker hiện hành. Luồng sau đăng nhập đạt trên ba môi trường và rollback có bằng chứng DB thật. Đã bổ sung workflow `.github/workflows/ci.yml`; còn chờ run GitHub Actions xanh trên commit tích hợp để xác nhận CI online. Người dùng cho biết nhóm chưa có Definition of Done/quy định merge riêng, vì vậy không tự áp thêm yêu cầu coverage, số approval hay staging làm điều kiện bắt buộc.

Kết quả mới nhất ở [results.json](qa-evidence-2026-11-15/results.json); bộ chạy tái lập ở [sprint1-browser-qa.cjs](sprint1-browser-qa.cjs). Các mục phía dưới ghi lại lần kiểm tra trước; mục kết luận này và phần E2E bổ sung cuối tài liệu là trạng thái hiện hành.

Mốc mã nguồn: `75558bb`, cùng các thay đổi chưa commit trong working tree. Báo cáo này bổ sung kết quả mới cho `qa01-test-cases.md` và `tv5-checklist.md`; các trạng thái cũ trong hai tài liệu đó chưa phản ánh lần chạy này.

## Kết quả chạy lại

| Kiểm tra | Kết quả |
|---|---|
| Backend automated tests | Pass 62/62: 56 Vitest và 6 Node tests; dùng mock, không chứng minh transaction DB thật |
| Frontend automated tests | Pass 134/134 trong 14 file |
| Backend / frontend lint | Pass |
| Frontend production build | Pass; còn cảnh báo bundle JS lớn hơn 500 kB |
| `git diff --check` | Pass |
| File môi trường local | `frontend/.env.local`, `backend/.env` đều được gitignore |

Hai test CreatePostPage ban đầu fail vì helper chọn món ngay khi select xuất hiện, trước khi danh sách bất đồng bộ tải xong. Đã sửa helper chờ option `Phở bò`; giữ nguyên các assertion và hành vi ứng dụng.

## Smoke API local với Supabase thật

Chạy app backend từ working tree trên cổng ngẫu nhiên loopback, không dùng mock, tự đóng server sau khi xong. Lần đầu sandbox chặn mạng EACCES; chạy lại với quyền truy cập mạng đã thành công. Không ghi hay xóa dữ liệu Supabase.

| Request | Kết quả |
|---|---|
| GET `/api/health` | 200 |
| GET `/api/dishes?page=1&limit=2` | 200, hai món |
| GET `/api/posts?page=1&limit=5` | 200, ba bài, ID theo thứ tự 4, 3, 1 |
| GET `/api/posts/4`, `/api/posts/3` | 200; mỗi bài có hai nguyên liệu và hai bước; author không có trường email |
| GET `/api/me` không token | 401 UNAUTHORIZED |
| GET `/api/posts/999999` | 404 NOT_FOUND |
| GET `/api/posts?page=-1&limit=abc` | 400 VALIDATION_ERROR |

Hai bài QA được giữ nguyên:

- ID 4: `QA E2E Sprint 1 fresh signup 20261115-1610`.
- ID 3: `QA E2E Sprint 1 20261115-1606`.

## Bàn giao và cấu hình local

Theo thông tin Copilot do người dùng cung cấp, luồng đăng ký → đăng nhập → tạo bài → feed/detail → tải lại → đăng xuất đã chạy qua Supabase. Lần tiếp nối này xác minh lại API đọc và dữ liệu đã lưu; không chạy lại luồng trình duyệt đó. Không suy ra Chrome/Firefox/mobile hoặc rollback transaction đã pass.

Frontend đã có `VITE_API_URL` rỗng; Vite proxy `/api` tới `http://localhost:3000`. Mock chỉ bật khi biến cấu hình bằng `true`, hiện local không bật. Không còn listener trên 3001, 5173, 5174 khi kiểm tra. Backend cổng 3000 đang chạy bằng `node --watch src/server.js` (watch PID 15032, child PID 20252 tại thời điểm kiểm tra). Chưa xác định chủ sở hữu tiến trình này nên giữ nguyên. Các server smoke do lần tiếp nối tạo đã tự đóng.

Các thay đổi Copilot để lại được giữ nguyên, gồm API `/api/me`, test, SQL grant và tài liệu; chưa commit hay chạy SQL grant trong lần này.

## Phạm vi còn thiếu

- Bằng chứng trình duyệt cho Chrome, Firefox và viewport mobile; đăng nhập có token và phục hồi session trong lần chạy mới.
- Kiểm tra transaction rollback với lỗi ở bảng con trên DB test có kiểm soát.
- AC/policy email được nhóm xác nhận, CI online, staging và review trước khi kết luận Sprint 1 Done.

## E2E bổ sung theo yêu cầu kết luận Done

Chạy lại toàn bộ suite: backend 62/62, frontend 134/134; lint FE/BE, build FE và diff check pass. Có cảnh báo bundle JS 584 kB, không làm build fail.

| Môi trường thực thi | Kết quả luồng sau đăng nhập | Bài tạo mới |
|---|---|---|
| Chromium 159.0.8154.6, desktop 1920×1080 | Pass | ID 5 |
| Firefox 159.0, desktop 1920×1080 | Pass | ID 6 |
| Chromium 159.0.8154.6, viewport 390×844 | Pass | ID 7 |

Mỗi môi trường đã kiểm tra: guard `/posts/new` cho guest; mật khẩu sai bị từ chối; đăng nhập đúng và tải profile; tạo bài hai nguyên liệu/hai bước; response 201 có thứ tự bước 1, 2 và không lộ email tác giả; detail; reload giữ phiên và bài; feed có bài mới; đăng xuất rồi reload không phục hồi phiên và route tạo bài được bảo vệ. Không có JavaScript page error; form không tràn ngang. Đây là headless Chromium/Firefox và viewport mobile, không phải Safari hoặc thiết bị di động thật.

Ảnh bằng chứng:

- [Form desktop](qa-evidence-2026-11-15/chromium-desktop-form.png), [detail desktop](qa-evidence-2026-11-15/chromium-desktop-detail.png).
- [Form Firefox](qa-evidence-2026-11-15/firefox-desktop-form.png), [detail Firefox](qa-evidence-2026-11-15/firefox-desktop-detail.png).
- [Form mobile](qa-evidence-2026-11-15/chromium-mobile-form.png), [detail mobile](qa-evidence-2026-11-15/chromium-mobile-detail.png).
- [Đăng ký bị rate limit](qa-evidence-2026-11-15/signup-blocked.png).

Đăng ký mới qua giao diện trả 429 `over_email_send_rate_limit`, UI báo giới hạn tần suất bằng tiếng Việt. Để tiếp tục test độc lập, tạo tài khoản QA qua Supabase admin API với email đã xác nhận, sau đó đăng nhập bằng giao diện thật. Không thay đổi Auth policy, rate limit hoặc SQL grant. Việc tạo fixture này không chứng minh luồng xác nhận email công khai. Các tài khoản fixture QA và bài ID 5–7 được giữ lại; không xóa dữ liệu cũ ID 3/4.

### Transaction rollback thật

RPC `create_post_with_recipe` được gọi bằng JWT người dùng QA, với nguyên liệu đầu tiên có tên marker mới và nguyên liệu thứ hai có ID chắc chắn không tồn tại. RPC trả `ERR_INGREDIENT_NOT_FOUND` sau các bước insert công thức và nguyên liệu đầu tiên theo hàm SQL trong repo. Đếm trực tiếp `cong_thuc.ten_ct` và `nguyen_lieu.ten_nl` theo marker trước/sau đều bằng 0; feed không có bài mang marker. Kết quả: **Pass cho đường lỗi bảng con này**; không suy ra mọi loại lỗi transaction đã được test.

`service_role` hiện không có SELECT trên `bai_dang` (403, PostgreSQL `42501`). Vì vậy xác minh không có công thức/nguyên liệu mồ côi bằng truy vấn DB, và bài công khai bằng feed. Không cấp thêm quyền chỉ để kiểm thử. Lần thử ban đầu dừng trước thao tác ghi vì HEAD không đọc được bảng này; bộ kiểm thử đã được điều chỉnh để dùng quyền đọc hiện có.

### Kiểm tra âm qua API thật

POST bài không token/sai token và GET me sai token đều 401; detail ID `abc`/`-1` trả 400; phân trang món page 0/limit -1 trả 400; tìm món không khớp trả 200 với data rỗng và total 0.

### Các điều kiện ghi nhận trước xác nhận mới của người dùng (lịch sử)

1. Giải quyết hoặc chờ hết giới hạn gửi email của Supabase theo chính sách nhóm, rồi chạy lại đăng ký công khai và xác nhận email nếu bật. Không đổi policy chỉ để có kết quả Pass.
2. Đối chiếu AC/Definition of Done chính thức và xác nhận policy DB06. Các case chưa chạy ngoài phạm vi bổ sung này (ví dụ đăng ký trùng trên Auth thật, các trạng thái feed bằng fault injection) không tự động được đánh dấu Pass bởi E2E luồng chính.
3. Review/commit các thay đổi working tree; bổ sung hoặc xác minh CI và staging theo điều kiện DO02/DO03 của nhóm. Working tree và HEAD hiện không có `.github/workflows`, trái với mô tả cũ trong checklist; chưa có chứng cứ CI online xanh.

Đánh giá lịch sử của lần E2E tự động: S1-02/S1-03 đạt luồng tích hợp local; S1-01 đạt đăng nhập/session/logout, đăng ký khi đó Blocked. Xác nhận thủ công mới của người dùng đã bổ sung bằng chứng đăng ký thành công; xem kết luận cập nhật đầu tài liệu và [hướng dẫn CI](ci.md). JSON giữ nguyên kết quả thực thi lịch sử để không biến xác nhận thủ công thành kết quả tự động.

### Chạy lại bộ E2E

Cần FE `http://localhost:5173`, backend cổng 3000, Playwright đã có Chromium/Firefox và backend `.env` hợp lệ. Bộ chạy tạo tài khoản/bài QA trên DB thật; không chạy trên production. Ví dụ PowerShell với Playwright đã cài ở thư mục tạm:

```powershell
$env:QA_PLAYWRIGHT = "$env:TEMP/sprint1-browser-qa/node_modules/playwright"
node docs/sprint1-browser-qa.cjs
```

`QA_ROLLBACK_ONLY=true` chỉ chạy lại rollback và giữ kết quả trình duyệt trong JSON; bỏ biến này khi muốn chạy toàn bộ. Exit code 1 khi bất kỳ kết quả nào Fail hoặc Blocked, kể cả khi ba luồng trình duyệt đều Pass. Bộ chạy không ghi mật khẩu/JWT ra artifact.
