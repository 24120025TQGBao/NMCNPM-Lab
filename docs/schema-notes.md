# Ghi chú schema Supabase / Data dictionary

Nguồn nền ngày 11/11/2026: kết quả truy vấn `information_schema` và `pg_constraint` trên Supabase do TV3 thiết lập. Phần mở rộng ngày 21/11/2026 bên dưới mô tả migration trong repo, đã kiểm thử cục bộ; chưa xác nhận đã triển khai trên Supabase thật.

## 1. Bảng dùng trong Sprint 1

| Bảng | Khóa chính | Cột chính | Ghi chú |
|---|---|---|---|
| `mon_an` | `ma_mon` (bigint) | `ten_mon`, `mo_ta_ngan`, `hinh_anh`, `trang_thai`, `vung_mien` | `trang_thai`: ACTIVE, HIDDEN, DELETED. `vung_mien`: xem mục 5 |
| `nguoi_dung` | `ma_nd` (uuid, trùng `auth.users.id`) | `ten_hien_thi`, `anh_dai_dien`, `vai_tro`, `trang_thai` | `trang_thai`: ACTIVE, LOCKED. `vai_tro`: USER, ADMIN |
| `bai_dang` | `ma_bai` (bigint) | `ma_tac_gia`, `loai_bai`, `ma_ct`, `tieu_de`, `noi_dung`, `trang_thai`, `tao_luc` | `loai_bai`: RECIPE, REVIEW. `trang_thai`: DRAFT (mặc định), PUBLIC, HIDDEN, DELETED. Bài RECIPE bắt buộc có `ma_ct`, không có `ma_quan`, `ma_mon_da_dung`, `gia_da_tra` |
| `cong_thuc` | `ma_ct` (bigint) | `ma_mon`, `ma_nguoi_tao`, `ten_ct`, `thoi_gian_phut`, `trang_thai_thanh_phan` | `trang_thai_thanh_phan`: COMPLETE, INCOMPLETE (mặc định) |
| `ct_nguyen_lieu` | (`ma_ct`, `ma_nl`) | `so_luong`, `don_vi`, `vai_tro_nl`, `ghi_chu` | `so_luong` > 0 hoặc null. `vai_tro_nl`: PRIMARY, SECONDARY (mặc định) |
| `buoc_cong_thuc` | (`ma_ct`, `stt`) | `noi_dung` | `stt` > 0, `noi_dung` không rỗng |
| `nguyen_lieu` | `ma_nl` (bigint) | `ten_nl` (UNIQUE), `la_gia_vi_co_ban` | Cờ tủ bếp boolean, mặc định false; xem mục 5 |
| `tag` | `ma_tag` (bigint identity) | `slug` (UNIQUE), `ten_tag` | Danh mục thẻ hoàn cảnh; xem mục 5 |
| `mon_an_tag` | (`ma_mon`, `ma_tag`) | Hai FK tới `mon_an`, `tag` | Quan hệ nhiều–nhiều; xem mục 5 |

## 2. Ánh xạ JSON ↔ DB


| JSON | Bảng.cột DB |
|---|---|
| `dish.id`, `dish.name`, `description`, `image_url` | `mon_an.ma_mon`, `ten_mon`, `mo_ta_ngan`, `hinh_anh` |
| `author.id`, `author.display_name` | `nguoi_dung.ma_nd`, `ten_hien_thi` |
| `post.id`, `title`, `content`, `created_at` | `bai_dang.ma_bai`, `tieu_de`, `noi_dung`, `tao_luc` |
| `post.dish` | `bai_dang.ma_ct` → `cong_thuc.ma_mon` → `mon_an` |
| `ingredients[]` | `ct_nguyen_lieu` (`so_luong`, `don_vi`, `vai_tro_nl`) + `nguyen_lieu` (`ma_nl`, `ten_nl`) |
| `steps[]` | `buoc_cong_thuc` (`stt` → `order`, `noi_dung` → `content`) |

Không trả email, số điện thoại hoặc dữ liệu nhạy cảm của người dùng qua API công khai.


## 3. Quyết định chốt (11/11/2026)

- ID trong API là số nguyên (bigint). Riêng `author.id` là UUID.
- Tạo bài: backend ghi `loai_bai = 'RECIPE'`, `trang_thai = 'PUBLIC'`. `bai_dang.noi_dung` lấy từ `content`, không có thì lấy `title`.
- Nguyên liệu gõ tay: Sprint 1 ban đầu so khớp tên không phân biệt hoa thường. Migration từ điển ở mục 6 bổ sung bỏ dấu và từ đồng nghĩa; chưa có thì tạo mới.
- Hiện DB chưa có hàm RPC tạo bài (chỉ có `create_user_profile`). Cần bổ sung để lưu trong một transaction.

## 4. Bảo mật

- Không trả email, số điện thoại hoặc dữ liệu nhạy cảm của người dùng ra API công khai.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm ở backend, không đưa vào biến `VITE_`.

## 5. Mở rộng chip hoàn cảnh, vùng miền, tủ bếp — 21/11/2026

Migration: [`202611210001_discovery_metadata.sql`](../supabase/migrations/202611210001_discovery_metadata.sql). Phụ thuộc nền BE07: migrations `202611110001`–`004`, gồm `app_private.active_user()` và `app_private.is_admin()`. Chỉ migration mới chạy lại được; không chạy lại toàn bộ `apply.sql` trên DB đã áp dụng nền.

| Bảng.cột | Kiểu / ràng buộc | Ý nghĩa / cách sử dụng |
|---|---|---|
| `tag.ma_tag` | bigint identity, PK | ID gắn với món; API giữ nguyên bigint theo contract hiện có |
| `tag.slug` | text, NOT NULL, UNIQUE | Mã ổn định; chỉ chữ thường ASCII, số, dấu gạch nối giữa các nhóm; ví dụ `bua-sang`. Không dùng nhãn hiển thị làm mã |
| `tag.ten_tag` | text, NOT NULL, không toàn khoảng trắng | Nhãn tiếng Việt hiển thị trên chip, ví dụ “Bữa sáng” |
| `mon_an_tag.ma_mon` | bigint, NOT NULL, FK → `mon_an.ma_mon` | Món được gắn thẻ |
| `mon_an_tag.ma_tag` | bigint, NOT NULL, FK → `tag.ma_tag` | Thẻ hoàn cảnh; PK cặp ngăn gắn trùng. Xóa vật lý món/tag sẽ xóa liên kết, không xóa đối tượng còn lại |
| `mon_an.vung_mien` | text, nullable, không default | `BAC` = Bắc, `TRUNG` = Trung, `NAM` = Nam, `KHAC` = khác. `NULL` = chưa phân loại; không được suy ra vùng từ tên món |
| `nguyen_lieu.la_gia_vi_co_ban` | boolean, NOT NULL, DEFAULT false | Đánh dấu nguyên liệu thuộc danh mục gia vị cơ bản; DA04 cần biên tập. Không tự suy ra nguyên liệu người dùng có sẵn |
| `ct_nguyen_lieu.vai_tro_nl` | text, NOT NULL, DEFAULT SECONDARY; CHECK PRIMARY/SECONDARY | Vai trò riêng trong từng công thức. PRIMARY = chính, SECONDARY = phụ; một nguyên liệu có thể có vai trò khác nhau giữa các công thức |

Không tự thêm taxonomy, gắn tag, gán vùng hoặc đánh dấu gia vị cho dữ liệu cũ. DA04 nhập danh mục/nhãn và biên tập metadata qua admin hoặc backend tin cậy. Dữ liệu cũ giữ ID, vai trò, số lượng và nội dung; cột vùng nhận NULL, cờ gia vị nhận false. Nếu role cũ sai miền giá trị hoặc NULL, transaction dừng để rà dữ liệu, không tự sửa thành SECONDARY. Không bắt buộc mỗi công thức có PRIMARY khi chưa có yêu cầu nghiệp vụ này.

Index: PK `(ma_mon, ma_tag)` phục vụ lấy tag của món; `(ma_tag, ma_mon)` phục vụ lọc theo chip; `(vung_mien, ma_mon) WHERE trang_thai='ACTIVE'` phục vụ lọc vùng món công khai.

### Quyền đọc/ghi

- Khách (`anon`) và thành viên đọc danh mục tag, nguyên liệu (gồm cờ tủ bếp), món ACTIVE và liên kết tag của món ACTIVE. Món HIDDEN/DELETED và liên kết của chúng không hiện cho khách.
- Admin ACTIVE quản lý tag/liên kết; thành viên thường và admin LOCKED không được ghi. Quyền sửa món/nguyên liệu theo nền BE07 được giữ nguyên.
- RLS mới có cả policy permissive và restrictive; policy permissive cũ không mở rộng quyền. Policy restrictive khác vẫn có thể thu hẹp quyền và cần rà tại môi trường đích. Service role là backend tin cậy và bỏ qua RLS.

### Contract bàn giao DA04 / BE08 / BE10

- DA04: nhập `tag(slug, ten_tag)`, sau đó gắn `mon_an_tag(ma_mon, ma_tag)`; biên tập `vung_mien` và `la_gia_vi_co_ban`. Dùng `ON CONFLICT (slug) DO UPDATE` khi nạp lại nhãn; dùng `ON CONFLICT DO NOTHING` khi gắn lại cặp món/tag. Không ghi đè vùng/flag đã biên tập khi chạy lại migration.
- BE08: lấy chip từ `tag`; lọc món qua `mon_an_tag.ma_tag` và `mon_an.vung_mien`. RPC `search_dishes` hiện chưa nhận tham số tag/vùng; việc mở rộng endpoint/RPC thuộc BE08.
- BE10: đọc role từ `ct_nguyen_lieu`, cờ tủ bếp từ `nguyen_lieu`. `match_recipes` hiện có trọng số mặc định PRIMARY:SECONDARY = 2:1, cấu hình được. Migration không đổi thuật toán, không tự thêm gia vị vào tập nguyên liệu đầu vào, không bỏ qua nguyên liệu dị ứng/hạn chế vì cờ tủ bếp.

Chi tiết chạy và bằng chứng: [bàn giao TV1/TV4](discovery-metadata-handoff.md). Trạng thái TV4: **chờ xác nhận**, không suy ra từ kết quả kiểm thử cục bộ.

## 6. Từ điển nguyên liệu chuẩn cho BE11 và DA04 — 21/11/2026

Migration [`202611210002_ingredient_dictionary.sql`](../supabase/migrations/202611210002_ingredient_dictionary.sql) bổ sung chuẩn hóa NFC, khoảng trắng, chữ thường và bỏ dấu tiếng Việt bằng hàm immutable `normalize_ingredient_name(text)`. Cột sinh `nguyen_lieu.ten_khong_dau` có unique index; `ten_nl` là tên có dấu để hiển thị. Migration áp dụng sau nền DB10/BE07 và metadata `202611210001`.

`nguyen_lieu_dong_nghia(ten_goi, ten_khong_dau, ma_nl)` giữ cả tên chuẩn và tên gọi khác. Khóa chính `ten_khong_dau` bảo đảm mỗi tên gọi chỉ trỏ một ID. FK tới `nguyen_lieu` có ON DELETE CASCADE. Trigger tự đăng ký tên chuẩn khi tạo/đổi tên, giữ tên cũ như alias và chặn một alias trở thành nguyên liệu mới. Unique registry xử lý cả ghi đồng thời. Khách/thành viên đọc; admin ACTIVE biên tập; service role là backend tin cậy. Audit dữ liệu gốc nằm trong `app_private`, không công khai qua REST.

| Contract | Kết quả |
|---|---|
| `resolve_ingredient(p_name text)` | ID chuẩn hoặc NULL; so khớp chính xác sau chuẩn hóa và tra alias |
| `search_ingredients(p_search text='', p_limit integer=20)` | Các dòng `{ma_nl, ten_nl}` duy nhất, tìm theo tiền tố tên/alias, giới hạn 1–100; hỗ trợ index `text_pattern_ops` |
| `create_post_with_recipe(...)` | Giữ contract Sprint 1; tên có dấu/không dấu/alias đã biết dùng lại ID chuẩn; tên mới được đăng ký; trùng sau quy đổi trả `ERR_INGREDIENT_DUPLICATE` và rollback bài |

Ví dụ `resolve_ingredient('hanh xanh')`, `resolve_ingredient('Hành hoa')`, `resolve_ingredient('hanh la')` trả cùng ID “Hành lá”. BE11 dùng resolver khi đầu vào là tên, rồi truyền **ID chuẩn** cho `match_recipes`; RPC này vẫn nhận mảng ID. `search_ingredients` là RPC cho autocomplete, chưa có HTTP endpoint BE11 trong thay đổi này. Client cần tải lại danh mục/cache ID sau triển khai vì ID của các bản ghi bị gộp sẽ hết hiệu lực.

Khi gộp, chuyển cả `ct_nguyen_lieu` và `han_che_nguyen_lieu`; cờ gia vị lấy OR, PRIMARY ưu tiên SECONDARY và ALLERGY ưu tiên AVOID. Cùng công thức và đơn vị thì cộng lượng nếu tất cả lượng đều biết. Khác đơn vị/thiếu lượng thì giữ lượng gốc trong `ghi_chu`, không tự đổi đơn vị hoặc bịa số lượng; khác đơn vị đánh dấu công thức INCOMPLETE để rà. Tên gốc, chế biến và số đếm nằm trong ghi chú; bản ghi nguồn đầy đủ được giữ trong audit. Tên mơ hồ/nhóm nhiều nguyên liệu cần DA04 biên tập; tên mới chưa có trong taxonomy được giữ như người dùng nhập, hệ thống không tự suy diễn dấu hay đồng nghĩa chưa biết.

Bằng chứng, danh sách cần rà và hướng dẫn triển khai: [bàn giao từ điển nguyên liệu](ingredient-dictionary-handoff.md).
