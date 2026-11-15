# Kiểm thử tự động trên GitHub Actions

Workflow [CI](../.github/workflows/ci.yml) chạy khi push, mở/cập nhật pull request và chạy thủ công (`workflow_dispatch`, sau khi workflow có trên nhánh mặc định). Chưa giới hạn nhánh vì nhóm chưa xác nhận nhánh tích hợp. Job tên ổn định `checks` để dùng làm required status check.

Runner Ubuntu dùng Node.js 24. Pipeline cài dependencies bằng `npm ci` từ hai lockfile, lint backend/frontend, chạy toàn bộ test hai bên, build frontend và kiểm tra cú pháp ba entrypoint backend. Mỗi bước lỗi sẽ làm job thất bại; không có `continue-on-error`. Lần chạy mới trên cùng PR/nhánh hủy lần cũ.

## Cấu hình cần thiết

Không cần GitHub Secrets cho workflow này. Test backend dùng mock Supabase và cấu hình giả; test frontend dùng các mock hiện có. Build FE xác minh khả năng đóng gói, không tạo bản deploy đã cấu hình Supabase. Không cần cài dependencies ở package gốc vì hai ứng dụng có package/lockfile riêng.

Job chỉ có `contents: read`, checkout không giữ credentials. Workflow không chạy bộ E2E ghi dữ liệu thật `docs/sprint1-browser-qa.cjs`. Bộ E2E đó cần môi trường riêng, tài khoản QA và chính sách giữ/dọn dữ liệu được nhóm thống nhất trước khi đưa vào CI.

## Đưa vào sử dụng

1. Commit/push workflow cùng các source/test mà nó cần. Đặc biệt các file `/api/me` và test tích hợp đang chưa được track phải đi cùng thay đổi router; tránh commit router mà thiếu file import.
2. Mở tab Actions hoặc Checks của PR, xem workflow `CI`, job `checks`.
3. Lưu URL run xanh cùng commit SHA làm bằng chứng DO02. Thành công local không thay thế kết quả GitHub runner.
4. Với quyền quản trị repo, cấu hình ruleset/branch protection của nhánh đích yêu cầu check `checks` và số approval theo quy định nhóm. File YAML không tự cấu hình yêu cầu merge này.
5. Nếu DO02 yêu cầu chứng minh CI chặn lỗi, trên nhánh thử riêng tạo một assertion cố ý fail, push để ghi nhận job đỏ, sau đó bỏ assertion và push lại để có job xanh. Không merge assertion cố ý fail.

Theo tài liệu chính thức của [checkout](https://github.com/actions/checkout) và [setup-node](https://github.com/actions/setup-node), workflow dùng actions v7 và cache npm theo đường dẫn lockfile của hai package.

## Kiểm chứng local

Đã tạo bản sao source sạch trong thư mục tạm, không có `.env` hoặc dependencies local; cài mới cả hai package bằng `npm ci`. Lint FE/BE, backend 62/62 test, frontend 134/134 test, build FE production và kiểm tra cú pháp BE đều pass. YAML đã được parse thành công. Kiểm chứng này chạy trên Windows; lần chạy Ubuntu/GitHub Actions đầu tiên vẫn cần commit/push để xác nhận.

Máy local dùng Node 24.11.1, npm có cảnh báo engine do jsdom yêu cầu Node 24.15.0 trở lên trong nhánh 24. Workflow chọn bản Node 24 mới nhất do `setup-node` cung cấp; nên dùng Node >=24.15.0 khi tái lập local. Không cần sửa lockfile để cài dependencies.

## Quy ước hiện tại và phần mở rộng

Người dùng xác nhận nhóm chưa có Definition of Done/tiêu chí nghiệm thu hoặc quy định merge PR riêng. Vì vậy workflow chạy trên mọi nhánh và PR, dùng bộ lint/test/build hiện có làm chuẩn; không áp thêm ngưỡng coverage, số approval hay bắt buộc staging chưa được nhóm thống nhất.

Không cần thêm quy định nghiệp vụ để sử dụng CI cơ bản này. Nếu sau này muốn kiểm thử nghiệp vụ rộng hơn, nhóm có thể cung cấp AC cho từng story, vai trò/quyền người dùng, ràng buộc công thức và policy xác nhận email. Nếu thêm E2E thật, cần URL staging, tài khoản QA và quy tắc tạo/giữ/dọn dữ liệu; cấu hình secret bằng GitHub Secrets, không gửi giá trị secret trong tài liệu hoặc chat.

Người dùng đã xác nhận kiểm thử đăng ký công khai thành công sau lần retest 15/11/2026. Không cần coi rate limit quan sát trước đó là blocker hiện hành; bằng chứng này là xác nhận thủ công của người dùng, không phải kết quả của workflow mock.
