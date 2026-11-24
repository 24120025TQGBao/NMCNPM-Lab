# Bàn giao schema DA04 / BE08 / BE10 cho TV1, TV4

Ngày chuẩn bị: 21/11/2026 (Asia/Ho_Chi_Minh). Ưu tiên P0; hạn trong yêu cầu là 16/11, đã qua hạn. Phụ thuộc BE07. Trạng thái: triển khai trong repo và kiểm thử PostgreSQL cục bộ hoàn tất; chờ áp dụng Supabase, gửi thông báo qua kênh nhóm và TV4 xác nhận.

## Tài liệu và thay đổi

- [Data dictionary và contract tích hợp](schema-notes.md#5-mở-rộng-chip-hoàn-cảnh-vùng-miền-tủ-bếp--21112026).
- [Migration chạy lại được](../supabase/migrations/202611210001_discovery_metadata.sql).
- [Kiểm thử metadata/RLS/dữ liệu có sẵn](../supabase/tests/discovery_metadata.sql).
- [Hồi quy nền BE07](../supabase/tests/requirements.sql).

Thêm `tag`, `mon_an_tag`, `mon_an.vung_mien` và `nguyen_lieu.la_gia_vi_co_ban`; bảo đảm role công thức PRIMARY/SECONDARY có ràng buộc. Khách đọc tag và món ACTIVE; liên kết tới món ẩn không hiện. Admin ACTIVE quản lý taxonomy. DA04 chưa có dữ liệu phân loại được phê duyệt nên migration không tự gán tag/vùng/gia vị cho món hoặc nguyên liệu thật.

## Áp dụng Supabase

1. Sao lưu schema/dữ liệu và xác minh BE07 (`202611110001`–`004`) đã áp dụng. Rà policy đích bằng `supabase/audit.sql`, đặc biệt policy restrictive hiện có.
2. Chạy **toàn bộ** `supabase/migrations/202611210001_discovery_metadata.sql` trong Supabase SQL Editor với quyền postgres. File có BEGIN/COMMIT; nếu lỗi, `ROLLBACK;`, rà nguyên nhân và chạy lại file. Không chạy fixture hoặc test tạo dữ liệu mẫu lên Supabase thật.
3. Chạy lại đúng migration mới để xác nhận tính lặp lại trên đích. Không chạy lại `apply.sql`: bốn migration nền vẫn chỉ chạy một lần.
4. Dùng anon key kiểm tra REST `tag?select=ma_tag,slug,ten_tag`, `mon_an?select=ma_mon,vung_mien`, `mon_an_tag?select=ma_mon,ma_tag` và `nguyen_lieu?select=ma_nl,la_gia_vi_co_ban`. Nếu chưa có tag, mảng rỗng là hợp lệ; cần DA04 nạp danh mục trước khi nghiệm thu hiển thị chip. Xác minh dữ liệu món ẩn không xuất hiện, ghi bằng khách/thành viên bị từ chối, admin ACTIVE ghi được.
5. Ghi thời điểm, môi trường, kết quả và xác nhận của TV4 vào mục nghiệm thu bên dưới. Migration đã yêu cầu PostgREST reload schema khi commit.

Môi trường hiện có URL REST và service-role key, chưa có kết nối PostgreSQL/phiên SQL Editor được cung cấp để áp dụng DDL. Chưa có bằng chứng migration đã chạy trên Supabase thật. Không xóa cột/bảng để rollback vì có thể đã có metadata mới; khi phát hiện lỗi, sửa bằng migration tiếp theo hoặc khôi phục từ backup đã kiểm chứng.

## Bằng chứng kiểm thử cục bộ

PostgreSQL **18.6**, container cục bộ `lab-db-requirements-test`, ngày 21/11/2026:

- `discovery_metadata.sql`: PASS trong DB trống `discovery_metadata_verified`. Áp dụng BE07, tạo dữ liệu món/nguyên liệu/công thức cũ, chạy migration mới, thêm metadata, chạy lại migration. So sánh toàn bộ cột cũ và xác minh metadata không bị ghi đè.
- PASS: miền giá trị vùng/role, NOT NULL, định dạng/unique slug, tên không trắng, PK cặp, hai FK; SELECT bằng anon; chặn ghi khách/thành viên; admin ACTIVE ghi được, admin LOCKED bị chặn; permissive policy mở toàn bộ không làm lộ liên kết món ẩn; xóa tag chỉ xóa liên kết.
- PASS: đối sánh input chỉ PRIMARY đạt 66.67%, chỉ SECONDARY đạt 33.33% với trọng số 2:1; cờ gia vị không đổi role/trọng số.
- `fixture.sql` → `apply.sql` → `requirements.sql`: PASS trong DB trống riêng `discovery_metadata_regression`, xác minh chuỗi migration đầy đủ và hồi quy BE07.

Tái lập trong hai DB thử nghiệm **trống, dùng riêng**, PostgreSQL 15+ có superuser:

```sh
psql "$DISCOVERY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/discovery_metadata.sql
psql "$REGRESSION_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/fixture.sql -f supabase/apply.sql -f supabase/tests/requirements.sql
```

Fixture mô phỏng schema; kết quả này không chứng minh cấu hình Supabase thật. Script metadata tạo dữ liệu nền có commit để kiểm tra rerun; hủy DB thử nghiệm sau khi sử dụng, không chạy lại vào cùng DB đã có fixture.

## Nội dung thông báo TV1, TV4

> TV1, TV4: phần schema phục vụ DA04/BE08/BE10 đã sẵn sàng trong repo: tag + liên kết nhiều–nhiều với món, vùng miền BAC/TRUNG/NAM/KHAC (NULL = chưa phân loại), cờ gia vị cơ bản, role PRIMARY/SECONDARY giữ nguyên và được kiểm tra. Migration mới đã chạy hai lần, test bảo toàn dữ liệu/RLS/đối sánh và hồi quy BE07 đều PASS trên PostgreSQL 18.6 cục bộ. Data dictionary: docs/schema-notes.md; migration: supabase/migrations/202611210001_discovery_metadata.sql. Chờ chạy trên Supabase đích và TV4 xác nhận contract dùng được. BE08 cần bổ sung lọc tag/vùng; BE10 dùng role theo công thức, cờ gia vị không tự bỏ qua dị ứng. DA04 cần nạp taxonomy và phân loại dữ liệu.

## Nghiệm thu còn chờ

| Mục | Trạng thái / bằng chứng cần bổ sung |
|---|---|
| Supabase chạy migration + rerun, giữ dữ liệu thật | Chờ kết nối SQL/SQL Editor; chưa chạy |
| RLS guest trên Supabase đích | Cục bộ PASS; chờ kiểm tra đích |
| Báo TV1/TV4 | Đã soạn nội dung; chờ kênh/liên hệ để gửi |
| TV4 xác nhận dùng được | Chờ TV4 đọc dictionary, thử contract và ghi xác nhận |
| PR hoặc tài liệu | Tài liệu bàn giao này và data dictionary trong workspace; chưa tạo PR/push |
