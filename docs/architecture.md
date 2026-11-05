# Tài liệu Kiến trúc Hệ thống & Hướng dẫn Tích hợp (Sprint 1 MVP)

> **Mã công việc:** DOC01 (Tài liệu kiến trúc) & INT01 (Hướng dẫn tích hợp).  
> **Người thực hiện:** TV1 (Product Owner + Backend Lead).  
> **Áp dụng cho:** Toàn đội ngũ phát triển (TV1, TV2, TV3, TV4, TV5).

---

## 1. Tổng quan Kiến trúc Hệ thống

Hệ thống "Hôm nay ăn gì?" trong Sprint 1 được tổ chức theo kiến trúc phân tầng (Layered Architecture) kết hợp dịch vụ BaaS (Backend-as-a-Service) của Supabase:

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (TV2)                        │
│                   React + Vite (SPA)                        │
│   - Supabase Auth SDK (Đăng ký, Đăng nhập, Quản lý Token)   │
│   - Giao diện: Feed bài viết, Form tạo công thức (Option A) │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               │ HTTP Bearer JWT               │ Trực tiếp Auth
               ▼                               ▼
┌─────────────────────────────────┐     ┌─────────────────────┐
│          Backend (TV1)          │     │    Supabase Auth    │
│       Node.js + Express 5       │     │ (Quản lý User & JWT)│
│  - app.js: Helmet, CORS, Error  │     └──────────┬──────────┘
│  - requireAuth: Xác minh JWT    │                │
│  - Validation: Zod schemas      │                │
│  - Services: Posts & Mappers    │                │
│  - Routes:                      │                │
│    + /api/posts (TV1)           │                │
│    + /api/dishes (TV4)          │                │
└────────────────┬────────────────┘                │
                 │                                 │
                 │ Anon Client (Public Read)       │
                 │ User Client (RLS Context)       │
                 ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Database (TV3)                   │
│                       PostgreSQL 15                         │
│  - Bảng: posts, dishes, profiles, ingredients, ...          │
│  - Transaction RPC (DB09): create_post_with_recipe          │
│  - RLS Policies (DB06): Phân quyền đọc/ghi công khai        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Ranh giới Trách nhiệm & Điểm cắm (Module Boundaries)

| Thành viên | Trách nhiệm chính | Điểm cắm kỹ thuật / Giao diện tương tác |
|---|---|---|
| **TV1** (Bạn) | Core Express, Auth middleware, Error handling, API Bài viết (`/api/posts`) | File router `backend/src/routes/posts.routes.js`, Service `backend/src/services/posts.service.js` |
| **TV2** (Frontend) | UI đăng nhập/đăng ký, hiển thị Feed, Form tạo bài công thức | Gọi API Backend theo [docs/api.md](file:///Users/huong/Documents/it/nmcnpm/th/NMCNPM-Lab/docs/api.md) kèm `Authorization: Bearer <access_token>` |
| **TV3** (Database) | Cấu hình Supabase, Auth, RLS policies, RPC transaction lưu bài (DB09) | Khớp tên bảng trong [docs/schema-notes.md](file:///Users/huong/Documents/it/nmcnpm/th/NMCNPM-Lab/docs/schema-notes.md); cung cấp RPC `create_post_with_recipe` |
| **TV4** (Tra cứu món) | Dataset món ăn mẫu, API `GET /api/dishes?search=` | Cắm logic vào file rỗng có sẵn: `backend/src/routes/dishes.routes.js` |
| **TV5** (DevOps & QA) | CI GitHub Actions, chạy `npm run lint` & `npm test`, deploy Vercel | Phụ thuộc tên script npm trong `package.json` và biến môi trường mẫu trong `.env.example` |

---

## 3. Luồng dữ liệu chính (Data Flows)

### 3.1. Luồng Xác thực (Authentication Flow)
1. Người dùng nhập email/mật khẩu tại Frontend.
2. Frontend gọi trực tiếp `supabase.auth.signInWithPassword(...)` từ trình duyệt.
3. Supabase Auth trả về `access_token` (JWT).
4. Frontend lưu token trong bộ nhớ/session và gửi kèm header `Authorization: Bearer <access_token>` trong mọi request cần quyền (ví dụ `POST /api/posts`).
5. Middleware `requireAuth` (`backend/src/middleware/auth.js`) trích xuất Bearer token, gọi `supabase.auth.getUser(token)` để lấy `user.id` và gán vào `req.auth = { userId, accessToken }`.

### 3.2. Luồng Tạo bài viết công thức (`POST /api/posts` - Transaction)
```
Frontend             Express Router          Auth Middleware          Posts Controller          Posts Service              Supabase DB
   │                        │                       │                        │                         │                        │
   │── POST /api/posts ────►│                       │                        │                         │                        │
   │   (Bearer Token)       │── requireAuth ───────►│                        │                         │                        │
   │                        │   (Verify JWT)        │── next() ─────────────►│                         │                        │
   │                        │                       │   req.auth.userId      │── createPost() ────────►│                        │
   │                        │                       │                        │   (Validate Zod)        │── RPC: create_post ───►│
   │                        │                       │                        │                         │   (Atomic Transaction) │
   │                        │                       │                        │                         │◄── Return Post ID ─────│
   │                        │                       │                        │                         │── getPostById(id) ────►│
   │                        │                       │                        │                         │◄── Full Post Detail ───│
   │◄── 201 Created ────────┴───────────────────────┴────────────────────────┴─────────────────────────┤                        │
   │    { data: PostDetail }                                                                                                    │
```

---

## 4. Hướng dẫn Tích hợp dành cho các Thành viên (INT01)

### 4.1. Hướng dẫn dành cho TV2 (Frontend Developer)
- **Base URL API:** `http://localhost:4000` (hoặc qua Vite proxy `/api`).
- **Gọi API Bảng tin (Feed):**
  - Endpoint: `GET /api/posts?page=1&limit=20` (Công khai, không cần header `Authorization`).
  - Response có cấu trúc `{ data: [...], meta: { page, limit, total } }`.
- **Gọi API Chi tiết bài viết:**
  - Endpoint: `GET /api/posts/:id` (Công khai).
  - Trả về đối tượng bài viết có sẵn mảng `ingredients` và `steps` (đã sắp xếp thứ tự `order` từ nhỏ đến lớn).
- **Tạo bài viết mới:**
  - Endpoint: `POST /api/posts`
  - Bắt buộc gắn header: `Authorization: Bearer ${supabaseSession.access_token}`.
  - Body định dạng JSON: Xem chi tiết mẫu trong [docs/api.md](file:///Users/huong/Documents/it/nmcnpm/th/NMCNPM-Lab/docs/api.md).

### 4.2. Hướng dẫn dành cho TV4 (Dữ liệu & API Tra cứu Dishes)
- Bạn chỉ cần làm việc trong thư mục `backend/src/routes/dishes.routes.js`.
- Tuyệt đối không cần sửa `src/app.js` hay `src/routes/index.js` vì điểm cắm `/api/dishes` đã được cấu hình sẵn.
- Tái sử dụng `paginationQuerySchema` và `getPaginationRange` tại `backend/src/utils/pagination.js` để xử lý phân trang đồng nhất với API bài viết.

### 4.3. Hướng dẫn dành cho TV3 (Database)
- Hàm Postgres RPC lưu bài viết trong 1 transaction (Task DB09):
  - **Tên đề xuất:** `create_post_with_recipe`.
  - **Tham số nhận:** `p_dish_id (UUID)`, `p_title (TEXT)`, `p_ingredients (JSONB)`, `p_steps (JSONB)`.
  - **Trả về:** `UUID` của bài viết vừa được tạo.
- Nếu RPC chưa sẵn sàng, backend đang có cơ chế Fallback bù trừ (tự động xóa bài viết nếu lưu nguyên liệu/bước nấu bị lỗi).

### 4.4. Hướng dẫn dành cho TV5 (DevOps & QA)
- **Tên scripts CI tiêu chuẩn:**
  ```bash
  cd backend
  npm run lint    # Chạy ESLint kiểm tra cú pháp
  npm test        # Chạy Vitest chạy toàn bộ unit test (hiện có 21 tests passed)
  npm run dev     # Khởi động môi trường phát triển
  npm start       # Khởi động production
  ```
- **Deploy Vercel:** File `backend/src/app.js` đã tách biệt hoàn toàn không gọi `app.listen()`, cho phép export Express app dưới dạng Vercel Serverless Function hoặc Container một cách liền mạch.

