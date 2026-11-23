# Bàn giao RPC đối sánh nguyên liệu cho BE10 và BE12

Ngày 22/11/2026, người nhận TV4. Ưu tiên P0; hạn yêu cầu 18/11/2026 đã qua. Phụ thuộc DB10, DB11 và dữ liệu DA04. RPC và kiểm thử PostgreSQL cục bộ hoàn tất; triển khai Supabase và buổi tích hợp cùng TV4 còn chờ thực hiện.

## Triển khai

Chạy toàn bộ [migration đối sánh](../supabase/migrations/202611220001_dish_matching.sql) bằng quyền postgres sau bốn migration BE07, metadata `202611210001` và từ điển `202611210002`. File có transaction, chạy lại được và yêu cầu PostgREST tải lại schema. Database mới dùng [apply.sql](../supabase/apply.sql) sau schema nền; database hiện có chỉ chạy migration còn thiếu. Không chạy fixture/test lên production.

Giữ nguyên `match_recipes(bigint[], numeric, numeric)` cho caller cũ. BE10 và BE12 dùng RPC mới `match_dishes` để nhận một kết quả cho mỗi món; không gọi cả hai rồi tự trộn điểm. Nếu cần thay trọng số, cần thống nhất và sửa contract RPC mới; 2:1 là lựa chọn triển khai kế thừa từ RPC cũ.

## Công thức và lựa chọn công thức món

Gọi A là tập ID nguyên liệu có sẵn. Khi `p_include_pantry=true`, A được hợp với các ID có `nguyen_lieu.la_gia_vi_co_ban=true`. Tủ bếp mặc định **tắt**; bật nghĩa là người dùng đồng ý giả định các gia vị đã được DA04 đánh dấu đang có sẵn. Cờ gia vị không thay role. Không tự suy diễn đồng nghĩa, thay thế nguyên liệu hoặc thành phần của tên dạng “Muối/tiêu”. BE11 resolve tên/alias thành ID chuẩn trước khi gọi; ID cũ sau gộp từ điển cần tải lại.

Mỗi nguyên liệu trong một công thức có trọng số w = 2 nếu PRIMARY, w = 1 nếu SECONDARY:

```text
matched_weight = tổng w của nguyên liệu thuộc A
total_weight   = tổng w của tất cả nguyên liệu đã ghi trong công thức
match_percent  = round(100 × matched_weight / total_weight, 2)
```

Mẫu số bằng 0 trả `match_percent=null`, không trả 100%. Đầu vào trùng ID chỉ tính một lần. Điểm đo sự có mặt của **loại nguyên liệu**, không kiểm tra lượng trong tủ có đủ số gam/ml của công thức. Với dữ liệu chưa đầy đủ, phần trăm chỉ phản ánh danh sách đã biết.

Chỉ xét món và công thức ACTIVE, theo RLS của caller. Công thức có nguyên liệu trùng ALLERGY hoặc AVOID của `auth.uid()` bị loại kể cả khi bật tủ bếp. Nếu tất cả công thức khả kiến bị loại bởi hạn chế thì món bị loại. Món không có công thức ACTIVE khả kiến vẫn trả một dòng INCOMPLETE, `ma_ct=null`.

Khi món có nhiều công thức, ưu tiên công thức đủ dữ liệu, rồi phần trăm chưa làm tròn giảm dần, số nguyên liệu thiếu tăng dần, `ma_ct` tăng dần. Chỉ trả nguyên liệu thiếu của công thức được chọn; không gộp nguyên liệu của nhiều công thức. Thứ tự món cũng ưu tiên đủ dữ liệu, điểm giảm dần, số thiếu tăng dần, `ma_mon` tăng dần. Phân trang được áp dụng sau khi chọn một công thức cho mỗi món.

## Ngưỡng sẵn sàng

| `readiness` | Nhãn BE hoặc FE | Điều kiện |
|---|---|---|
| `COOK_NOW` | Nấu ngay | Đủ dữ liệu và thiếu 0 loại nguyên liệu |
| `MISSING_1_2` | Thiếu 1–2 thứ | Đủ dữ liệu và thiếu 1 hoặc 2 loại |
| `NEED_SHOPPING` | Cần đi chợ | Đủ dữ liệu và thiếu từ 3 loại |
| `INCOMPLETE` | Chưa đầy đủ dữ liệu | Luôn ưu tiên hơn ba nhóm trên khi `is_incomplete=true` |

Nhóm dùng số loại thiếu chính xác, không suy ra từ phần trăm đã làm tròn. `is_incomplete=true` khi không có công thức/nguyên liệu, trạng thái thành phần chưa COMPLETE, thiếu thời gian hoặc bước nấu, hoặc có dòng nguyên liệu thiếu lượng/đơn vị hợp lệ mà không có ghi chú cho lượng tùy ý. Quy tắc lượng kế thừa DB10: lượng dương kèm đơn vị không trắng, hoặc lượng NULL kèm ghi chú không trắng. Không tự nâng INCOMPLETE lên COMPLETE.

BE12 phải hiển thị cờ này và tránh khẳng định nấu được dù điểm 100% hay danh sách thiếu rỗng. Khi không có công thức, `missing_count=0` và `missing_ingredients=[]` nghĩa là chưa có danh sách để đối chiếu; `readiness=INCOMPLETE` quyết định cách hiển thị.

## Contract RPC và cách gọi từ backend

| Tham số | Kiểu và mặc định | Kiểm tra |
|---|---|---|
| `p_ingredient_ids` | bigint[], bắt buộc | 0–1000 phần tử; `[]` hợp lệ; NULL, phần tử NULL và ID không tồn tại gây SQLSTATE 22023 |
| `p_include_pantry` | boolean = false | NULL bị từ chối |
| `p_limit` | integer = 100 | 1–500; NULL bị từ chối |
| `p_offset` | integer = 0 | Không âm; NULL bị từ chối |

Trả mảng dòng: `ma_mon, ten_mon, ma_ct, ten_ct, match_percent, matched_weight, total_weight, missing_count, missing_ingredients, readiness, is_incomplete`. Mỗi phần tử thiếu gồm `ma_nl, ten_nl, role, so_luong, don_vi, ghi_chu`, sắp theo ID. Lượng/đơn vị/ghi chú có thể NULL, không tự thay bằng 0. Không có món khả dụng trả `[]`.

```javascript
import { createClient } from '@supabase/supabase-js';

// Tạo client theo request bằng JWT của chính người dùng để auth.uid()/RLS
// và ALLERGY/AVOID hoạt động. Không tái sử dụng client có JWT giữa người dùng.
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${userAccessToken}` } },
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data, error } = await db.rpc('match_dishes', {
  p_ingredient_ids: ingredientIds, // ID chuẩn từ BE11; [] nếu tủ đang trống
  p_include_pantry: includePantry,
  p_limit: 100,
  p_offset: 0
});
if (error) {
  // 22023 -> HTTP 400; các lỗi còn lại theo error middleware của backend.
  // Không biến lỗi DB thành kết quả rỗng hoặc kết quả nấu ngay.
  throw error;
}
// BE10 dùng data để trả kết quả; BE12 dùng cùng ma_ct + missing_ingredients.
```

Khách dùng client anon không có Authorization JWT cá nhân. RPC cấp EXECUTE cho anon/authenticated/service_role và chạy SECURITY INVOKER, `search_path=''`. Service role không có JWT người dùng sẽ không có hạn chế cá nhân để lọc; không dùng service-role client trần cho kết quả cá nhân hóa. Có thể gọi trực tiếp PostgREST `POST /rest/v1/rpc/match_dishes` với cùng JSON tham số.

## Năm bộ nguyên liệu đối chiếu tính tay

Fixture độc lập: món Trứng cà chua gồm Trứng PRIMARY (2), Cà chua PRIMARY (2), Muối SECONDARY (1), Dầu ăn SECONDARY (1). Tổng trọng số 6, đủ thời gian và bước nấu. Tủ bếp tắt trong cả năm ca.

| Có sẵn | Phép tính | Điểm RPC | Thiếu | Nhóm |
|---|---|---|---|---|
| Không có | 100 × 0/6 | 0.00% | Trứng, cà chua, muối, dầu | Cần đi chợ |
| Trứng | 100 × 2/6 | 33.33% | Cà chua, muối, dầu | Cần đi chợ |
| Trứng, cà chua | 100 × 4/6 | 66.67% | Muối, dầu | Thiếu 1–2 thứ |
| Trứng, cà chua, muối | 100 × 5/6 | 83.33% | Dầu | Thiếu 1–2 thứ |
| Cả bốn | 100 × 6/6 | 100.00% | Không | Nấu ngay |

[SQL kiểm thử](../supabase/tests/dish_matching.sql) chạy RPC thật, kiểm tra cả phần trăm, số thiếu, ID thiếu và nhóm. PASS PostgreSQL 18.6 ngày 22/11/2026. Các ca bổ sung PASS: bật tủ bếp có muối/dầu đạt 100% từ hai nguyên liệu chính, ID trùng không tăng điểm, INCOMPLETE vẫn báo chưa đủ khi 100%, món chưa có công thức trả điểm NULL, thiếu bước nấu, món/công thức ẩn, dị ứng khi bật tủ bếp, phân trang, input sai và migration chạy hai lần. Bộ hồi quy [requirements.sql](../supabase/tests/requirements.sql) cũng PASS sau migration mới.

Tái lập trên database **trống dùng riêng**, superuser, PostgreSQL 15+:

```sh
psql "$MATCHING_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/dish_matching.sql
psql "$MATCHING_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/requirements.sql
```

## Hiệu năng trên dataset hiện tại

Snapshot đọc ngày 22/11/2026: 72 món ACTIVE, 90 công thức ACTIVE của các món đó, 299 nguyên liệu, 770 dòng thành phần, 409 bước nấu. Nạp vào PostgreSQL 18.6 cục bộ với schema/migration trong repo; ANALYZE rồi đo dưới role anon, 1 lần làm nóng và 30 lần mỗi cấu hình, limit 100, offset 0.

| Cấu hình | Trung vị ms | P95 ms | Cao nhất ms |
|---|---:|---:|---:|
| Tập rỗng | 5.18 | 6.25 | 6.45 |
| 5 ID đầu theo thứ tự ID | 5.09 | 5.42 | 5.71 |
| Toàn bộ 299 ID | 12.54 | 13.06 | 14.95 |
| 5 ID và bật tủ bếp | 4.88 | 5.44 | 5.93 |

Mốc kiểm tra nội bộ đề xuất: P95 SQL dưới 100 ms cho quy mô này; các lần đo đều đạt. Kết quả chưa bao gồm độ trễ mạng, PostgREST, tải đồng thời, policy khác trên Supabase thật và dữ liệu hạn chế cá nhân. TV4 cần ghi thêm thời gian endpoint BE10/BE12 khi tích hợp.

Index mới: `matching_active_recipe(ma_mon,ma_ct) WHERE trang_thai='ACTIVE'`, `matching_pantry(ma_nl) WHERE la_gia_vi_co_ban`. Tận dụng PK `(ma_ct,ma_nl)`, index đảo `(ma_nl,ma_ct)` và PK bước nấu `(ma_ct,stt)` từ DB10. Vì phải tính cả số thiếu/mẫu số và trả cả món chưa có dữ liệu, truy vấn vẫn tổng hợp các công thức ứng viên; LIMIT không loại chi phí chấm điểm trước đó.

[Script benchmark](../supabase/tests/benchmark_dish_matching.mjs) sinh SQL nạp snapshot và đo trong transaction rồi ROLLBACK. Chạy sau fixture + apply trên DB trống. JSON snapshot dùng các mảng `dishes`, `recipes`, `ingredients`, `rows`, `steps`; trường tương ứng SELECT ở phần nạp script. Chỉ xuất dữ liệu công khai ACTIVE, không xuất tài khoản, token hoặc thông tin người tạo. Snapshot không được commit vào repo.

```sh
node supabase/tests/benchmark_dish_matching.mjs snapshot.json > /tmp/matching-benchmark.sql
psql "$MATCHING_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/matching-benchmark.sql
```

## Tích hợp cùng TV4 và nghiệm thu còn lại

Tài liệu này là đường dẫn bàn giao trong repo; chưa tạo PR/push và chưa áp dụng DDL trên Supabase trong phiên này. Thực hiện buổi tích hợp với TV4 khi có phiên làm việc chung:

1. Áp dụng migration còn thiếu trên Supabase, xác minh RPC xuất hiện sau schema reload.
2. TV4 gọi RPC bằng anon và JWT người dùng thật, xác nhận BE10/BE12 dùng cùng công thức được trả về.
3. Đối chiếu năm ca trên DB thử nghiệm và dữ liệu DA04: role, gia vị cơ bản, trạng thái COMPLETE, thời gian, bước nấu. Không đánh COMPLETE hàng loạt chỉ để đạt nhóm nấu ngay.
4. Kiểm tra món INCOMPLETE 100% vẫn có nhãn chưa đầy đủ; tủ bếp không bỏ qua ALLERGY/AVOID; thử input sai trả 400.
5. Ghi thời gian endpoint, môi trường, người kiểm tra và xác nhận TV4 vào ticket. Chưa có buổi tích hợp/biên bản xác nhận TV4 trong phiên hiện tại.