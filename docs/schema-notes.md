# Ghi chú schema Supabase (đối chiếu 11/11/2026)

Nguồn: kết quả truy vấn `information_schema` và `pg_constraint` trên Supabase do TV3 thiết lập.

## 1. Bảng dùng trong Sprint 1

| Bảng | Khóa chính | Cột chính | Ghi chú |
|---|---|---|---|
| `mon_an` | `ma_mon` (bigint) | `ten_mon`, `mo_ta_ngan`, `hinh_anh`, `trang_thai` | `trang_thai`: ACTIVE, HIDDEN, DELETED |
| `nguoi_dung` | `ma_nd` (uuid, trùng `auth.users.id`) | `ten_hien_thi`, `anh_dai_dien`, `vai_tro`, `trang_thai` | `trang_thai`: ACTIVE, LOCKED. `vai_tro`: USER, ADMIN |
| `bai_dang` | `ma_bai` (bigint) | `ma_tac_gia`, `loai_bai`, `ma_ct`, `tieu_de`, `noi_dung`, `trang_thai`, `tao_luc` | `loai_bai`: RECIPE, REVIEW. `trang_thai`: DRAFT (mặc định), PUBLIC, HIDDEN, DELETED. Bài RECIPE bắt buộc có `ma_ct`, không có `ma_quan`, `ma_mon_da_dung`, `gia_da_tra` |
| `cong_thuc` | `ma_ct` (bigint) | `ma_mon`, `ma_nguoi_tao`, `ten_ct`, `thoi_gian_phut`, `trang_thai_thanh_phan` | `trang_thai_thanh_phan`: COMPLETE, INCOMPLETE (mặc định) |
| `ct_nguyen_lieu` | (`ma_ct`, `ma_nl`) | `so_luong`, `don_vi`, `vai_tro_nl`, `ghi_chu` | `so_luong` > 0 hoặc null. `vai_tro_nl`: PRIMARY, SECONDARY (mặc định) |
| `buoc_cong_thuc` | (`ma_ct`, `stt`) | `noi_dung` | `stt` > 0, `noi_dung` không rỗng |
| `nguyen_lieu` | `ma_nl` (bigint) | `ten_nl` (UNIQUE) | Không có cờ xác minh |

## 2. Ánh xạ JSON ↔ DB

Xem mục 5 của `docs/api.md`.

## 3. Quyết định chốt (11/11/2026)

- ID trong API là số nguyên (bigint). Riêng `author.id` là UUID.
- Tạo bài: backend ghi `loai_bai = 'RECIPE'`, `trang_thai = 'PUBLIC'`. `bai_dang.noi_dung` lấy từ `content`, không có thì lấy `title`.
- Nguyên liệu gõ tay: so khớp `ten_nl` không phân biệt hoa thường, chưa có thì tạo mới.
- Hiện DB chưa có hàm RPC tạo bài (chỉ có `create_user_profile`). Cần bổ sung để lưu trong một transaction.

## 4. Bảo mật

- Không trả email, số điện thoại hoặc dữ liệu nhạy cảm của người dùng ra API công khai.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm ở backend, không đưa vào biến `VITE_`.