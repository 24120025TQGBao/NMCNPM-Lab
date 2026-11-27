### Mock cho hai tab gợi ý (Sprint 2)

| Biến | Giá trị | Ý nghĩa |
|---|---|---|
| `VITE_USE_MOCK_API` | `true` (mặc định) | Dùng dữ liệu giả cho `/api/suggestions`, `/api/ingredients`, `/api/dishes/match` |
| `VITE_USE_MOCK_API` | `false` | Gọi backend thật. Khi tên trường API khác contract, chỉ sửa `src/api/adapters.js` |

### Tra cứu món và công thức (S2-03, S2-04)

Mở `/search`, tìm tên món có dấu hoặc không dấu, lọc loại món/khẩu vị/thời gian và chọn món → **Tự nấu** → công thức. Bộ lọc và trang nằm trong URL, được giữ khi quay lại hoặc dùng Back của trình duyệt. Quán ăn hiển thị **Sắp có**.

- Dev độc lập với BE09: `VITE_USE_MOCK=true npm run dev`. Dữ liệu mẫu chỉ nằm trong bộ nhớ.
- API thật: `VITE_USE_MOCK=false npm run dev`. Bản production luôn gọi API thật. Không tự chuyển sang mock khi API lỗi.
- `VITE_USE_MOCK_API` ở trên chỉ điều khiển hai tab gợi ý, không điều khiển luồng tra cứu này.
- Chi tiết contract và bằng chứng kiểm thử: [bàn giao catalog](../docs/catalog-handoff.md).
