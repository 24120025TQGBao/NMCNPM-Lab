### Mock cho hai tab gợi ý (Sprint 2)

| Biến | Giá trị | Ý nghĩa |
|---|---|---|
| `VITE_USE_MOCK_API` | `true` (mặc định) | Dùng dữ liệu giả cho `/api/suggestions`, `/api/ingredients`, `/api/dishes/match` |
| `VITE_USE_MOCK_API` | `false` | Gọi backend thật. Khi tên trường API khác contract, chỉ sửa `src/api/adapters.js` |