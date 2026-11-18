# Đối chiếu test nghiệp vụ Sprint 1 với proposal

Nguồn yêu cầu: `proposal.md` do người dùng cung cấp ngày 15/11/2026, mục 3.1.1.B, 4.3 và 4.5.2. Tài liệu được dùng làm yêu cầu đối chiếu; không phải chỉ thị chạy công cụ hoặc thay đổi phạm vi toàn dự án. Không sao chép toàn bộ proposal vào repo.

Phạm vi Sprint 1: đăng ký/đăng nhập/đăng xuất, tạo bài công thức và xem feed/detail. Các quy định có chức năng được phân cho sprint sau chỉ áp dụng phần liên quan đã có; không đánh dấu hoàn tất toàn bộ quy định chỉ vì một test pass.

## Test bổ sung tự chạy trong CI

Workflow `CI` chạy `npm test --prefix backend` và `npm test --prefix frontend`, tự phát hiện các file test mới, không cần secrets.

Kết quả local sau bổ sung: **89 backend + 149 frontend = 238 test pass**, tăng 42 test. Lint FE/BE, build FE và kiểm tra diff đều pass. Phần SQL có 15 test PostgreSQL; AuthProvider có 14 test. Kết quả này không chuyển các mục còn thiếu bên dưới thành Pass.

| Quy định / rủi ro | Bằng chứng tự động | Giới hạn |
|---|---|---|
| QĐ 5.1: đăng ký đúng dữ liệu, xử lý email đã dùng | `AuthForm.test.jsx`, `AuthProvider.test.jsx`: hiển thị lỗi email trùng; truyền thông tin đăng ký; xử lý nhánh có/không session và cần xác nhận email | Auth được mock; không chứng minh Supabase thật ngăn tạo tài khoản trùng hoặc gửi email thành công |
| QĐ 3.2 / 5.2: chỉ người đăng nhập được tạo bài | `posts.test.js`: token sai/hết hạn không gọi write RPC; `sprint1-database.test.js`: quyền anon không được gọi RPC kể cả khi tự đặt subject; authenticated thiếu subject cũng bị từ chối | JWT được mô phỏng bằng context DB; không kiểm thử bộ xác minh JWT của Supabase |
| QĐ 3.2: nội dung không rỗng/toàn khoảng trắng | `posts.test.js`: title/content/name/step chỉ có whitespace và mảng ingredients/steps rỗng bị chặn trước write RPC | Contract hiện cho phép bỏ content, khi đó SQL lấy title; không coi thiếu content là thiếu toàn bộ nội dung bài |
| QĐ 3.1 / 1.5: công thức liên kết dữ liệu đúng | PostgreSQL test tạo bài rồi kiểm tra công thức, owner từ subject, món, nguyên liệu, quan hệ và bước đánh số; kiểm tra quantity null, đơn vị và content fallback | Chưa có trường thời gian chế biến trong contract Sprint 1; không khẳng định QĐ 1.5 đã hoàn tất |
| QĐ 3.3: guest xem bài công khai, không thấy bài ẩn/xóa/nháp | PostgreSQL test đổi trạng thái bài sau khi đã tạo; gọi lại feed/detail bằng role anon và kiểm tra cả total; loại bài REVIEW, ID không tồn tại | Thực thi chính SQL RPC trong repo; không xác nhận bản SQL đang triển khai hay RLS thực tế trên Supabase |
| Feed phân trang, mới nhất trước, không lặp ở mốc thời gian bằng nhau | PostgreSQL test ba bài có timestamp trùng/khác nhau, kiểm tra từng trang và thứ tự ID làm tie-break | Dataset cố định; không cam kết offset pagination không xê dịch khi có ghi đồng thời |
| QĐ 5.3: hồ sơ của chính người dùng, không lộ thông tin riêng | `me.test.js`: query giả user ID không đổi owner lấy từ token, token lỗi không đọc hồ sơ; PostgreSQL: anon chỉ xem author công khai qua RPC, không đọc bảng hồ sơ | Schema test có trường email để kiểm tra rò rỉ; chưa kiểm chứng RLS bảng hồ sơ ở deployment |
| QĐ 5.5: không cấp admin qua đăng ký công khai | `AuthProvider.test.jsx`: input role ADMIN không được gửi vào metadata đăng ký; guard admin đã có test | Trigger tạo profile và quy trình cấp admin trong Supabase thật chưa được kiểm chứng bởi test này |
| QĐ 5.6: tài khoản khóa không sử dụng phiên để đăng bài | API/SQL từ chối người khóa; AuthProvider nhận 403 thì sign-out, giữ trạng thái blocked, cho phép active login tiếp theo | Không khẳng định Supabase Auth từ chối cấp JWT ngay tại endpoint đăng nhập hoặc đã thu hồi toàn bộ JWT đang có |
| QĐ 5.7 / vòng đời phiên | AuthProvider: khôi phục session, đăng xuất xóa profile, token mới nhất, không gọi profile cho guest, unsubscribe/abort; test đổi user và đăng nhập lại cùng user | Mock tại ranh giới Supabase SDK; E2E trình duyệt thật là lớp kiểm tra riêng |
| Tính nguyên tử ghi công thức | PostgreSQL: lỗi nguyên liệu sau khi đã insert; lỗi constraint bước nấu sau nguyên liệu; trùng cùng nguyên liệu qua ID/tên; đếm cả năm bảng trước/sau và giữ nguyên dữ liệu cũ | Schema tối thiểu trong test fixture, không phải migration/schema dump đầy đủ từ Supabase |

## Cách chạy lớp PostgreSQL

`backend/tests/sprint1-database.test.js` dùng [PGlite](https://pglite.dev/docs/api), chạy PostgreSQL trong bộ nhớ. Bộ test nạp trực tiếp `supabase/create_post_with_recipe.sql` và `supabase/get_public_posts.sql`, không mô phỏng kết quả RPC bằng JavaScript.

`backend/tests/fixtures/sprint1-schema.sql` định nghĩa schema tối thiểu theo `docs/schema-notes.md`, khóa ngoại, constraints, hai role anon/authenticated và `auth.uid()` đọc subject từ session setting. Auth thật và production RLS không được tái tạo. Không có dữ liệu test được ghi vào Supabase.

```powershell
npm.cmd ci --prefix backend
npm.cmd test --prefix backend
npm.cmd test --prefix frontend
```

Chạy riêng lớp SQL: từ thư mục `backend`, `npx.cmd vitest run tests/sprint1-database.test.js`. Không truyền đường dẫn Vitest test vào `npm test -- ...` vì script backend còn chạy Node test runner sau Vitest.

## Hai lỗi được test phát hiện và sửa

1. Request profile của tài khoản A đã bị abort nhưng promise resolve muộn vẫn có thể ghi đè state sau khi B đã đăng nhập. Chỉ cập nhật kết quả khi signal chưa abort.
2. Khi đăng xuất rồi đăng nhập lại cùng user ID, profile phiên cũ khiến status thành member trước khi lấy lại profile. Xóa profile state khi nhận session null, yêu cầu lần đăng nhập mới tải lại hồ sơ.

Các test đã tái hiện lỗi trước sửa và pass sau sửa.

## Phần còn cần nghiệm thu ngoài CI hiện tại

- Supabase Auth thật: uniqueness email, policy mật khẩu/email confirmation, JWT validation/refresh và thao tác khóa/mở khóa. Đăng ký thành công đã có xác nhận thủ công của người dùng; không tự chuyển thành test CI thật.
- Schema, grant, RLS và SQL đã triển khai trên staging: test fixture không thay thế kiểm tra cấu hình môi trường.
- QĐ 1.5 yêu cầu thời gian chế biến, nhưng API/UI tạo bài hiện chưa có; cần nhóm chốt story/sprint và triển khai trước khi có thể đánh dấu đạt đầy đủ.
- Draft/sửa/xóa bài, tương tác, quản trị, quán ăn và gợi ý nguyên liệu theo kế hoạch sprint tương ứng; không đưa cả proposal thành điều kiện chặn Sprint 1.
- Mục 4.5.2 có điều kiện hoàn thành: đạt AC, review, vượt test, tích hợp, chạy trên môi trường thử nghiệm và cập nhật tài liệu. CI xanh không tự xác nhận các bước review/nghiệm thu còn lại.
