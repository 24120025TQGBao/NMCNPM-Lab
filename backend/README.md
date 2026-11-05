# Backend - Hôm nay ăn gì? (Sprint 1)

API service cho ứng dụng chia sẻ công thức món ăn "Hôm nay ăn gì?", phát triển với Node.js, Express 5 và Supabase.

## 1. Cài đặt & Môi trường

Yêu cầu Node.js v20+ (khuyến nghị Node 22/24).

```bash
cd backend
npm install
```

Tạo file biến môi trường `.env` từ file mẫu:
```bash
cp .env.example .env
```
Điền các giá trị của Supabase URL và Supabase Anon Key.

## 2. Các lệnh khả dụng (NPM Scripts)

- **`npm run dev`**: Khởi động server ở chế độ phát triển (`node --watch`).
- **`npm start`**: Chạy server cho môi trường production.
- **`npm test`**: Chạy toàn bộ unit test với `vitest`.
- **`npm run lint`**: Kiểm tra định dạng code với `eslint`.

## 3. Cấu trúc thư mục

- `src/app.js`: Cấu hình ứng dụng Express, middleware, routes (không gọi `listen`).
- `src/server.js`: Điểm khởi chạy server, lắng nghe cổng `PORT`.
- `src/config/env.js`: Đọc và validate biến môi trường bằng Zod.
- `src/lib/supabase.js`: Khởi tạo Supabase client (anon và user-scoped).
- `src/middleware/`: Chứa middleware xác thực JWT (`auth.js`), bắt 404 (`notFound.js`) và xử lý lỗi tập trung (`errorHandler.js`).
- `src/routes/`:
  - `posts.routes.js`: Quản lý routes `/api/posts` (TV1 phụ trách).
  - `dishes.routes.js`: Điểm cắm route `/api/dishes` (TV4 phụ trách).
- `src/utils/`: Chứa `AppError.js` và các hàm tiện ích.
- `tests/`: Chứa các file kiểm thử tự động.

