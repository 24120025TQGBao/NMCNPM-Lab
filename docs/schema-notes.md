# Ghi chú Ánh xạ Schema Cơ sở Dữ liệu (Sprint 1)

Tài liệu này ghi lại thông tin đối chiếu schema thực tế trong repo và các giả định/thống nhất với TV3 (Database).

## 1. Schema hiện diện trong mã nguồn khởi tạo (`backend/src/app.js`, `supabase/seed.sql`, `README.md`)

Hiện tại trong mã nguồn ban đầu của dự án, cơ sở dữ liệu đang dùng quy ước đặt tên tiếng Việt không dấu (snake_case) cho một số bảng đã có:

| Bảng thực tế đã thấy | Khóa chính | Các cột đã dùng | Ý nghĩa |
|---|---|---|---|
| `public.mon_an` | `ma_mon` (UUID / text) | `ten_mon`, `mo_ta_ngan`, `hinh_anh`, `trang_thai` ('ACTIVE') | Danh mục món ăn |
| `public.nguoi_dung` | `ma_nd` (trùng `auth.users.id`) | `ten_hien_thi`, `anh_dai_dien`, `vai_tro`, `trang_thai` ('ACTIVE') | Profile người dùng công khai |

## 2. Bảng đối chiếu mô hình khái niệm (Spec) vs Schema

Theo đặc tả `00_CONTEXT.md` và `01_BE01_API_CONTRACT.md`, API của backend sẽ giao tiếp với frontend bằng các trường JSON chuẩn tiếng Anh (`snake_case`). Backend (tầng `posts.service.js`) sẽ chịu trách nhiệm chuyển đổi (mapping) giữa cột database và JSON trả về frontend:

| Khái niệm (API JSON) | Bảng DB dự kiến (TV3) | Cột DB tương ứng | Ghi chú chuyển đổi (Mapping) |
|---|---|---|---|
| **Dish (`dish`)** | `mon_an` (hoặc `dishes`) | `ma_mon` (hoặc `id`), `ten_mon` (hoặc `name`) | `ma_mon` -> `dish.id`, `ten_mon` -> `dish.name` |
| **Author (`author`)** | `nguoi_dung` (hoặc `profiles`) | `ma_nd` (hoặc `id`), `ten_hien_thi` (hoặc `display_name`) | `ma_nd` -> `author.id`, `ten_hien_thi` -> `author.display_name` |
| **Post (`post`)** | `bai_viet` (hoặc `posts`) | `id` / `ma_bai_viet`, `tieu_de` / `title`, `ngay_tao` / `created_at` | Giữ chuẩn JSON `id`, `title`, `created_at` |
| **Ingredients (`ingredients`)** | `nguyen_lieu` & `cong_thuc_nguyen_lieu` (hoặc `recipe_ingredients`) | `id` / `ma_nl`, `ten` / `name`, `dinh_luong` / `quantity`, `don_vi` / `unit` | Giữ chuẩn JSON `ingredient_id`, `name`, `quantity`, `unit` |
| **Steps (`steps`)** | `buoc_nau` (hoặc `recipe_steps`) | `thu_tu` / `step_order`, `noi_dung` / `content` | `step_order` / `thu_tu` -> `order`, `content` -> `content` |

## 3. Khóa ngoại và ràng buộc bảo mật (RLS)
- **RLS**: Người dùng chỉ đọc dữ liệu công khai (`ACTIVE`) qua `getAnonClient()`. Thao tác tạo bài ghi qua `createUserClient(token)` hoặc qua RPC transaction do TV3 cấp (`DB09`).
- **Bảo mật danh tính**: Tuyệt đối không trả email, số điện thoại từ `auth.users` hay `nguoi_dung` ra API công khai.

