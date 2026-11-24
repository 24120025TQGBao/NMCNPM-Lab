# Bàn giao từ điển nguyên liệu cho BE11 và DA04

**Bản bàn giao:** 22/11/2026. **Người nhận:** TV4, TV1. **Ưu tiên:** P0. **Phụ thuộc:** DB10 và schema metadata. **Hạn yêu cầu:** 17/11/2026.

Chuẩn hóa mỗi nguyên liệu về một tên tiếng Việt để tìm kiếm và đối sánh thống nhất. Tài liệu này chứa đầy đủ contract, quy tắc gộp, SQL migration đã sửa, SQL xác minh, kết quả kiểm thử và các việc cần nghiệm thu; có thể đính kèm riêng lên Jira mà không cần mở thêm file trong repo.

**Trạng thái:** triển khai và kiểm thử cục bộ hoàn tất. Supabase đã được chạy thử nhưng lần gần nhất báo lỗi guard tên chuẩn; bản sửa bên dưới đã tái hiện và xử lý lỗi đó ở cục bộ. Chờ xác nhận chạy thành công bản sửa trên Supabase và DA04 rà các tên mơ hồ. Chưa chốt nghiệm thu dữ liệu thật.

## 1. Phạm vi đã thực hiện

- Gộp các tên đồng nghĩa và biến thể đã xác định, gồm nguyên liệu tự tạo trong Sprint 1; giữ tên chuẩn có dấu.
- Thêm bảng `nguyen_lieu_dong_nghia`, cột tên không dấu và index để tìm chính xác hoặc theo tiền tố.
- Sửa RPC tạo bài Sprint 1 để dùng lại ID chuẩn khi người dùng nhập tên không dấu hoặc từ đồng nghĩa.
- Chuyển liên kết công thức và hạn chế nguyên liệu sang ID chuẩn, lưu dữ liệu nguồn trong audit.

Các ví dụ: hành xanh/hành hoa → Hành lá; hành khô → Hành tím; thơm/khóm → Dứa; xì dầu → Nước tương; lạc → Đậu phộng; dưa chuột → Dưa leo; nấm mèo → Mộc nhĩ; nước → Nước lọc. Danh sách ánh xạ đầy đủ nằm trong SQL ở mục 6.

## 2. Data dictionary và contract tích hợp

| Đối tượng | Contract |
|---|---|
| `nguyen_lieu.ma_nl` | ID bigint chuẩn; ID bị gộp không còn hợp lệ. Client phải tải lại danh mục/cache sau triển khai. |
| `nguyen_lieu.ten_nl` | Tên tiếng Việt dùng để hiển thị. |
| `nguyen_lieu.ten_khong_dau` | Cột sinh từ tên: chuẩn Unicode NFC, chữ thường, bỏ dấu tiếng Việt và gộp khoảng trắng; có unique index. |
| `nguyen_lieu_dong_nghia` | `ten_goi` là tên gọi; `ten_khong_dau` là khóa chính được sinh; `ma_nl` là FK tới nguyên liệu chuẩn, ON DELETE CASCADE. Giữ cả tên chuẩn và tên gọi khác. |
| `normalize_ingredient_name(value text)` | Hàm immutable chuẩn hóa tiếng Việt bằng bảng chuyển ký tự cố định; không phụ thuộc extension unaccent. |
| `resolve_ingredient(p_name text)` | Trả ID bigint chuẩn hoặc NULL; tra chính xác tên chuẩn/từ đồng nghĩa sau chuẩn hóa. |
| `search_ingredients(p_search text='', p_limit integer=20)` | Trả các dòng `{ma_nl, ten_nl}` duy nhất; tìm tiền tố của tên chuẩn/alias; limit được giới hạn 1–100. `%`, `_` và dấu gạch chéo ngược được coi là ký tự thường. |
| `create_post_with_recipe(p_dish_id, p_title, p_content, p_ingredients, p_steps)` | Giữ chữ ký Sprint 1. Nguyên liệu nhập bằng tên đã biết dùng lại ID chuẩn; tên mới vẫn được tạo và đăng ký. Hai đầu vào quy về cùng ID trong một công thức gây `ERR_INGREDIENT_DUPLICATE`, rollback toàn bộ bài/công thức. |
| `app_private.ingredient_merge_audit` | `old_id`, `canonical_id`, JSON nguyên liệu/các dòng công thức/hạn chế trước gộp và `merged_at`. Chỉ phục vụ quản trị, không công khai qua REST. |

**BE11:** nếu đầu vào là tên, gọi `resolve_ingredient`, xử lý NULL rồi truyền ID chuẩn cho `match_recipes`. Dùng `search_ingredients` để autocomplete. Thay đổi này cung cấp RPC, chưa bổ sung HTTP endpoint BE11. Không giữ ID cũ trong cache sau migration.

Ví dụ gọi từ Supabase client:

```javascript
const resolved = await supabase.rpc('resolve_ingredient', { p_name: 'hanh xanh' });
// resolved.data: ID của Hành lá; xử lý resolved.error hoặc data === null.
const suggestions = await supabase.rpc('search_ingredients', {
  p_search: 'hanh x', p_limit: 20
});
// suggestions.data: [{ ma_nl: <ID chuẩn>, ten_nl: 'Hành lá' }]
```

**Quyền:** anon và authenticated đọc taxonomy/RPC tìm kiếm. Admin ACTIVE biên tập alias; thành viên thường và admin LOCKED không được sửa. Service role là backend tin cậy. RLS có cả policy permissive và restrictive. Trigger đăng ký tên chuẩn và bảo vệ namespace dùng chung giữa tên chuẩn/alias; đổi tên giữ tên cũ như alias.

## 3. Quy tắc gộp và bảo toàn dữ liệu

| Trường hợp | Cách xử lý |
|---|---|
| Chọn ID sống sót | Ưu tiên bản ghi có tên khớp tên chuẩn, tiếp đến tên có ký tự ngoài ASCII, rồi ID nhỏ hơn. |
| Hai dòng cùng công thức và nguyên liệu sau gộp | Gộp về một cặp `(ma_ct, ma_nl)`; PRIMARY ưu tiên SECONDARY. |
| Cùng đơn vị và biết đủ lượng | Cộng lượng; giữ tên, lượng, đơn vị và ghi chú gốc trong ghi chú tổng hợp. |
| Khác đơn vị hoặc thiếu lượng | Không tự đổi đơn vị/bịa lượng. Để lượng tổng NULL, giữ lượng từng dòng trong ghi chú; khác đơn vị chuyển công thức sang INCOMPLETE để rà. |
| Cờ gia vị | Lấy OR giữa các bản ghi trong nhóm. |
| Hạn chế nguyên liệu | Chuyển cả `han_che_nguyen_lieu`; khi trùng người/nguyên liệu, ALLERGY ưu tiên AVOID. |
| Audit | Lưu cả bản ghi bị bỏ và ID sống sót trong nhóm bị thay đổi, kèm dữ liệu liên kết trước gộp. |

Migration khóa các bảng liên quan và thực hiện trong **một câu DO nguyên tử**. Trong khi gộp, hai guard tên được tạm bỏ dưới khóa bảng, rồi được tạo lại trong cùng câu lệnh. Nếu lỗi, dữ liệu và thay đổi trigger của câu DO cùng rollback.

## 4. Kết quả kiểm thử

Các kết quả sau thuộc môi trường PostgreSQL 18.6 cục bộ ngày 21/11/2026, không phải kết quả nghiệm thu Supabase thật:

- Snapshot đủ 340 tên lấy từ REST, gồm tên nguyên liệu Sprint 1, gộp còn **299 ID chuẩn**; 41 ID dư được bỏ, **82 dòng nguồn** của các nhóm bị thay đổi được lưu trong audit.
- Công thức giả lập dùng toàn bộ snapshot: tổng lượng 340 g được giữ, không mất liên kết, mọi tên cũ vẫn resolve được sau hai lần migration. Không dùng công thức production cho phép thử này.
- PASS: tìm không dấu, alias, NFC/NFD, hoa thường/khoảng trắng, tiền tố, ký tự wildcard, uniqueness tên chuẩn/alias; giữ alias tự thêm qua rerun.
- PASS: chuyển FK công thức/hạn chế, xử lý lượng/đơn vị/ghi chú/role/cờ gia vị, ưu tiên ALLERGY, không mồ côi.
- PASS: quyền anon/member/admin, audit riêng tư, restrictive RLS; tạo bài bằng alias và rollback khi trùng nguyên liệu sau quy đổi.
- Đã tái hiện chính xác lỗi `23514: Canonical name registry entry is required` trên dictionary có guard cũ. Bản sửa chuyển ID thành công, chạy lại được và vẫn chặn sửa tên chuẩn trái phép sau migration.
- Hồi quy SQL nền PASS. Backend **89 test PASS**: 83 Vitest và 6 Node, gồm 15 test PostgreSQL Sprint 1.

Các script tái lập trong repo: `supabase/tests/ingredient_dictionary.sql`, `ingredient_existing_registry_fixture.sql`, `ingredient_inventory.sql`, `ingredient_inventory_fixture.sql`, `fixture.sql`, `requirements.sql`; backend chạy `npm test`. Script kiểm thử chỉ dành cho DB trống dùng riêng, không chạy lên Supabase thật.

## 5. Cách triển khai trên Supabase

### Điều kiện trước khi chạy

Sao lưu schema/dữ liệu. Xác nhận DB10/BE07 `202611110001`–`004` và metadata `202611210001` đã áp dụng; có sẵn `app_private.is_admin()`, schema công thức/nguyên liệu và cột `la_gia_vi_co_ban`. Dùng SQL Editor với quyền postgres, không mang JWT của người dùng. Chọn thời điểm ít ghi vì migration có khóa bảng.

Rà FK trước khi chạy bằng truy vấn dưới đây. Cấu trúc Supabase người triển khai đã cung cấp gồm `ct_nguyen_lieu`, `han_che_nguyen_lieu` và `nguyen_lieu_dong_nghia`, đúng các bảng được xử lý. Nếu môi trường khác có thêm bảng tham chiếu, cần bổ sung chuyển ID cho bảng đó trước khi gộp.

```sql
SELECT conrelid::regclass AS referencing_table,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND confrelid = 'public.nguyen_lieu'::regclass;
```

### Thứ tự thực hiện

1. Nếu phiên còn lỗi transaction từ lần chạy cũ, chạy riêng `ROLLBACK;`.
2. Sao chép **toàn bộ khối SQL ở mục 6**, từ dòng đầu tới `$ingredient_dictionary$;`, vào một tab SQL Editor. Bỏ mọi vùng chọn và Run một lần. Không chạy cả tài liệu Markdown như SQL.
3. Sau khi thành công, chạy lại nguyên khối mục 6 để xác minh rerun; không chạy lại toàn bộ migrations nền hoặc `apply.sql` trên DB đã có nền.
4. Chạy khối kiểm tra mục 7 và đối chiếu kết quả theo hướng dẫn. Chạy từng truy vấn nếu SQL Editor chỉ hiển thị kết quả truy vấn cuối.
5. Kiểm tra một bài công thức có sẵn và tạo một bài thử bằng tài khoản ACTIVE, nhập nguyên liệu `hanh xanh`; phải dùng ID Hành lá. Thử nhập thêm `Hành lá` trong cùng công thức: phải bị báo trùng và không lưu bài dở dang. Xác minh hạn chế dị ứng và các công thức có đơn vị hỗn hợp.
6. BE11/client tải lại cache ID. DA04 rà dữ liệu mục 8. TV4 ghi xác nhận theo bảng nghiệm thu mục 9.

Nếu gặp `ingredient_vocabulary does not exist`, dùng đúng bản DO bên dưới, không tạo bảng tạm thủ công. Nếu gặp `Canonical name registry entry is required` khi chạy migration, bản SQL cũ có thể vẫn đang ở editor: thay **toàn bộ** bằng mục 6. Không tắt trigger bằng một lệnh riêng. Nếu vẫn lỗi, giữ đầy đủ ERROR/CONTEXT để điều tra.

Sau commit, không rollback bằng cách chỉ thêm lại các tên đã xóa vì FK đã chuyển. Dùng backup đã kiểm chứng hoặc migration bù dựa trên audit.

## 6. SQL migration đầy đủ

Nguồn: `supabase/migrations/202611210002_ingredient_dictionary.sql`. SQL dưới đây khớp nguyên văn file nguồn tại thời điểm bàn giao. SHA-256 (UTF-8): `fc15e9c80a0b1d153d485a45641f5abcbed4164620ae96ba76ed09f0a4dfeffa`.

```sql
-- DB10 + discovery metadata must already be applied. Run as postgres; atomic and rerunnable.
-- Run as one statement so temporary tables cannot disappear between editor requests.
DO $ingredient_dictionary$
BEGIN
LOCK TABLE public.nguyen_lieu, public.ct_nguyen_lieu, public.han_che_nguyen_lieu IN ACCESS EXCLUSIVE MODE;

-- Fixed Vietnamese transliteration avoids mutable extension dictionaries in index expressions.
CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SET search_path='' AS $$
 SELECT btrim(regexp_replace(translate(lower(normalize(value, NFC)),
 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ',
 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'), '[[:space:]]+', ' ', 'g'))
$$;
ALTER TABLE public.nguyen_lieu ADD COLUMN IF NOT EXISTS ten_khong_dau text
 GENERATED ALWAYS AS (public.normalize_ingredient_name(ten_nl)) STORED;

CREATE TABLE IF NOT EXISTS app_private.ingredient_merge_audit (
 old_id bigint PRIMARY KEY, canonical_id bigint NOT NULL, original_ingredient jsonb NOT NULL,
 recipe_rows jsonb NOT NULL, restriction_rows jsonb NOT NULL, merged_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON app_private.ingredient_merge_audit FROM PUBLIC, anon, authenticated;

CREATE TEMP TABLE ingredient_vocabulary(alias text, canonical text) ON COMMIT DROP;
INSERT INTO ingredient_vocabulary VALUES
  ('Hành lá', 'Hành lá'),
  ('Hành xanh', 'Hành lá'),
  ('Hành hoa', 'Hành lá'),
  ('Hành lá cắt nhuyễn', 'Hành lá'),
  ('Hành tím', 'Hành tím'),
  ('Hành khô', 'Hành tím'),
  ('Hành tím khô', 'Hành tím'),
  ('Hành tím băm', 'Hành tím'),
  ('Hành tím to', 'Hành tím'),
  ('Hành tím lớn', 'Hành tím'),
  ('Dứa', 'Dứa'),
  ('Thơm', 'Dứa'),
  ('Khóm', 'Dứa'),
  ('Ngò rí', 'Ngò rí'),
  ('Rau mùi', 'Ngò rí'),
  ('Mùi ta', 'Ngò rí'),
  ('Ngò gai', 'Ngò gai'),
  ('Mùi tàu', 'Ngò gai'),
  ('Đậu phộng', 'Đậu phộng'),
  ('Lạc', 'Đậu phộng'),
  ('Đậu phộng rang', 'Đậu phộng rang'),
  ('Lạc rang', 'Đậu phộng rang'),
  ('Dưa leo', 'Dưa leo'),
  ('Dưa chuột', 'Dưa leo'),
  ('Khổ qua', 'Khổ qua'),
  ('Mướp đắng', 'Khổ qua'),
  ('Bột ngọt', 'Bột ngọt'),
  ('Mì chính', 'Bột ngọt'),
  ('Nước tương', 'Nước tương'),
  ('Xì dầu', 'Nước tương'),
  ('Mỡ heo', 'Mỡ heo'),
  ('Mỡ lợn', 'Mỡ heo'),
  ('Thịt heo', 'Thịt heo'),
  ('Thịt lợn', 'Thịt heo'),
  ('Cá lóc', 'Cá lóc'),
  ('Cá tràu', 'Cá lóc'),
  ('Cá quả', 'Cá lóc'),
  ('Mộc nhĩ', 'Mộc nhĩ'),
  ('Nấm mèo', 'Mộc nhĩ'),
  ('Mộc nhĩ khô', 'Mộc nhĩ khô'),
  ('Nấm mèo khô', 'Mộc nhĩ khô'),
  ('Đậu hũ', 'Đậu hũ'),
  ('Đậu phụ', 'Đậu hũ'),
  ('Tàu hũ', 'Đậu hũ'),
  ('Đậu hũ trắng', 'Đậu hũ'),
  ('Đậu hũ chiên', 'Đậu hũ chiên'),
  ('Tàu hũ chiên', 'Đậu hũ chiên'),
  ('Đậu hũ chiên sẵn', 'Đậu hũ chiên'),
  ('Nước lọc', 'Nước lọc'),
  ('Nước', 'Nước lọc'),
  ('Dầu điều', 'Dầu điều'),
  ('Dầu màu điều', 'Dầu điều'),
  ('Dầu mè', 'Dầu mè'),
  ('Dầu vừng', 'Dầu mè'),
  ('Dầu mè thơm', 'Dầu mè'),
  ('Giò heo', 'Giò heo'),
  ('Chân giò heo', 'Giò heo'),
  ('Giò heo 2 cái', 'Giò heo'),
  ('Nạm bò', 'Nạm bò'),
  ('Thịt nạm bò', 'Nạm bò'),
  ('Nước dừa', 'Nước dừa'),
  ('Nước dừa tươi', 'Nước dừa'),
  ('Mẻ', 'Mẻ'),
  ('Cơm mẻ', 'Mẻ'),
  ('Giấm', 'Giấm'),
  ('Dấm', 'Giấm'),
  ('Tương cà', 'Tương cà'),
  ('Tương cà ketchup', 'Tương cà'),
  ('Rau xà lách', 'Rau xà lách'),
  ('Xà lách', 'Rau xà lách'),
  ('Gia vị nấu phở', 'Gia vị nấu phở'),
  ('Gia vị phở', 'Gia vị nấu phở'),
  ('Hành phi', 'Hành phi'),
  ('Hành tím phi', 'Hành phi'),
  ('Gừng', 'Gừng'),
  ('Gừng nhỏ', 'Gừng'),
  ('Gừng băm', 'Gừng'),
  ('Gừng băm nhuyễn', 'Gừng'),
  ('Nghệ', 'Nghệ'),
  ('Nghệ nhỏ', 'Nghệ'),
  ('Cà rốt', 'Cà rốt'),
  ('Cà rốt lớn', 'Cà rốt'),
  ('Hành tây', 'Hành tây'),
  ('Hành tây to', 'Hành tây'),
  ('Nước mắm', 'Nước mắm'),
  ('Nước mắm ngon', 'Nước mắm'),
  ('Hoa hồi', 'Hoa hồi'),
  ('Hoa hồi 2 cái', 'Hoa hồi'),
  ('Quế', 'Quế'),
  ('Quế thanh', 'Quế'),
  ('Huyết heo', 'Huyết heo'),
  ('Huyết heo lớn', 'Huyết heo'),
  ('Lá lốt', 'Lá lốt'),
  ('Lá lốt 15 cái', 'Lá lốt'),
  ('Lòng trắng trứng', 'Lòng trắng trứng'),
  ('Lòng trắng trứng 1 cái', 'Lòng trắng trứng'),
  ('Lòng đỏ trứng gà', 'Lòng đỏ trứng gà'),
  ('Lòng đỏ trứng gà 2 cái', 'Lòng đỏ trứng gà'),
  ('Lòng đỏ trứng muối', 'Lòng đỏ trứng muối'),
  ('Lòng đỏ trứng muối 17 cái', 'Lòng đỏ trứng muối'),
  ('Dạ dày heo', 'Dạ dày heo'),
  ('Dạ dày heo 1 cái', 'Dạ dày heo'),
  ('Bắp cải tím', 'Bắp cải tím'),
  ('Bắp cải tím 1/2 cái', 'Bắp cải tím'),
  ('Riềng', 'Riềng'),
  ('Riềng lớn', 'Riềng'),
  ('Ốc bươu', 'Ốc bươu'),
  ('Ốc bươu lớn', 'Ốc bươu'),
  ('Tỏi', 'Tỏi'),
  ('Tỏi băm', 'Tỏi'),
  ('Sả', 'Sả'),
  ('Sả băm', 'Sả'),
  ('Sả xay', 'Sả'),
  ('Rau ngổ', 'Rau ngổ'),
  ('Ngò om', 'Rau ngổ'),
  ('Thịt xay', 'Thịt xay'),
  ('Thịt băm', 'Thịt xay'),
  ('Miến khô', 'Miến khô'),
  ('Bún tàu khô', 'Miến khô');
-- Reject ambiguous transliterated vocabulary before any merge.
CREATE UNIQUE INDEX ON ingredient_vocabulary(public.normalize_ingredient_name(alias));
CREATE TEMP TABLE ingredient_plan ON COMMIT DROP AS
 WITH names AS (
   SELECT n.*, coalesce(v.canonical, btrim(regexp_replace(normalize(n.ten_nl, NFC), '[[:space:]]+', ' ', 'g'))) AS canonical
   FROM public.nguyen_lieu n LEFT JOIN ingredient_vocabulary v
     ON public.normalize_ingredient_name(v.alias)=n.ten_khong_dau
 ), targets AS (
   SELECT *, public.normalize_ingredient_name(canonical) AS target_key FROM names
 )
 SELECT ma_nl AS old_id, ten_nl AS old_name, canonical,
   first_value(ma_nl) OVER (PARTITION BY target_key ORDER BY (ten_nl=canonical) DESC,
     (ten_nl ~ '[^[:ascii:]]') DESC, ma_nl) AS canonical_id,
   first_value(canonical) OVER (PARTITION BY target_key ORDER BY (ten_nl=canonical) DESC,
     (ten_nl ~ '[^[:ascii:]]') DESC, ma_nl) AS canonical_name
 FROM targets;
-- Snapshot every affected group, including surviving IDs whose recipe rows will change.
INSERT INTO app_private.ingredient_merge_audit(old_id,canonical_id,original_ingredient,recipe_rows,restriction_rows)
 SELECT n.ma_nl,p.canonical_id,to_jsonb(n),
   coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM public.ct_nguyen_lieu i WHERE i.ma_nl=n.ma_nl),'[]'),
   coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM public.han_che_nguyen_lieu h WHERE h.ma_nl=n.ma_nl),'[]')
 FROM public.nguyen_lieu n JOIN ingredient_plan p ON p.old_id=n.ma_nl
 WHERE p.canonical_id IN (SELECT canonical_id FROM ingredient_plan
   WHERE old_id<>canonical_id OR old_name<>canonical_name)
 ON CONFLICT (old_id) DO NOTHING;

-- Rebuild only affected recipe pairs. Preserve original labels (including preparation/counts).
CREATE TEMP TABLE ingredient_recipe_rows ON COMMIT DROP AS
 SELECT i.*,p.canonical_id,p.old_name,p.canonical_name FROM public.ct_nguyen_lieu i
 JOIN ingredient_plan p ON p.old_id=i.ma_nl
 WHERE p.canonical_id IN (SELECT canonical_id FROM ingredient_plan WHERE old_id<>canonical_id OR old_name<>canonical_name);
DELETE FROM public.ct_nguyen_lieu i USING ingredient_recipe_rows r WHERE (i.ma_ct,i.ma_nl)=(r.ma_ct,r.ma_nl);
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,vai_tro_nl,ghi_chu)
 SELECT ma_ct,canonical_id,
   CASE WHEN count(*)=count(so_luong) AND count(DISTINCT coalesce(don_vi,''))=1 THEN sum(so_luong) END,
   CASE WHEN count(DISTINCT coalesce(don_vi,''))=1 THEN min(don_vi) END,
   CASE WHEN bool_or(vai_tro_nl='PRIMARY') THEN 'PRIMARY' ELSE 'SECONDARY' END,
   string_agg(concat(old_name, ': ',coalesce(so_luong::text,'tùy khẩu vị'),' ',coalesce(don_vi,''),
      CASE WHEN ghi_chu IS NOT NULL THEN ' ('||ghi_chu||')' ELSE '' END), '; ' ORDER BY ma_nl)
 FROM ingredient_recipe_rows GROUP BY ma_ct,canonical_id;
-- Mixed units are retained in notes, never converted or added together.
UPDATE public.cong_thuc c SET trang_thai_thanh_phan='INCOMPLETE'
 WHERE EXISTS (SELECT 1 FROM ingredient_recipe_rows r WHERE r.ma_ct=c.ma_ct
 GROUP BY r.canonical_id HAVING count(DISTINCT coalesce(r.don_vi,''))>1);

CREATE TEMP TABLE ingredient_restrictions ON COMMIT DROP AS
 SELECT h.*,p.canonical_id FROM public.han_che_nguyen_lieu h JOIN ingredient_plan p ON p.old_id=h.ma_nl;
DELETE FROM public.han_che_nguyen_lieu h USING ingredient_plan p WHERE h.ma_nl=p.old_id AND p.old_id<>p.canonical_id;
INSERT INTO public.han_che_nguyen_lieu(ma_nd,ma_nl,loai_han_che)
 SELECT ma_nd,canonical_id,CASE WHEN bool_or(loai_han_che='ALLERGY') THEN 'ALLERGY' ELSE 'AVOID' END
 FROM ingredient_restrictions GROUP BY ma_nd,canonical_id
 ON CONFLICT (ma_nd,ma_nl) DO UPDATE SET loai_han_che=excluded.loai_han_che;

-- Preserve existing aliases if this migration is rerun after taxonomy edits.
CREATE TABLE IF NOT EXISTS public.nguyen_lieu_dong_nghia (
 ten_goi text NOT NULL,
 ten_khong_dau text GENERATED ALWAYS AS (public.normalize_ingredient_name(ten_goi)) STORED PRIMARY KEY,
 ma_nl bigint NOT NULL REFERENCES public.nguyen_lieu(ma_nl) ON DELETE CASCADE,
 CHECK (public.normalize_ingredient_name(ten_goi)<>'')
 );
-- Existing guards protect user edits, but a merge must move canonical registry entries.
-- Hold both tables locked and restore the guards below in the same atomic statement.
LOCK TABLE public.nguyen_lieu_dong_nghia IN ACCESS EXCLUSIVE MODE;
DROP TRIGGER IF EXISTS protect_ingredient_name ON public.nguyen_lieu_dong_nghia;
DROP TRIGGER IF EXISTS register_ingredient_name ON public.nguyen_lieu;
UPDATE public.nguyen_lieu_dong_nghia a SET ma_nl=p.canonical_id FROM ingredient_plan p WHERE a.ma_nl=p.old_id AND p.old_id<>p.canonical_id;
UPDATE public.nguyen_lieu n SET la_gia_vi_co_ban=x.flag FROM (
 SELECT p.canonical_id,bool_or(n.la_gia_vi_co_ban) AS flag FROM ingredient_plan p
 JOIN public.nguyen_lieu n ON n.ma_nl=p.old_id GROUP BY p.canonical_id
) x WHERE n.ma_nl=x.canonical_id;
DELETE FROM public.nguyen_lieu n USING ingredient_plan p WHERE n.ma_nl=p.old_id AND p.old_id<>p.canonical_id;
UPDATE public.nguyen_lieu n SET ten_nl=p.canonical_name FROM ingredient_plan p WHERE n.ma_nl=p.old_id AND p.old_id=p.canonical_id AND n.ten_nl<>p.canonical_name;
CREATE UNIQUE INDEX IF NOT EXISTS nguyen_lieu_unaccent_unique ON public.nguyen_lieu(ten_khong_dau);
CREATE INDEX IF NOT EXISTS ingredient_alias_prefix ON public.nguyen_lieu_dong_nghia(ten_khong_dau text_pattern_ops);
CREATE INDEX IF NOT EXISTS ingredient_alias_target ON public.nguyen_lieu_dong_nghia(ma_nl);

INSERT INTO public.nguyen_lieu_dong_nghia(ten_goi,ma_nl)
 SELECT old_name,canonical_id FROM ingredient_plan ORDER BY old_id
 ON CONFLICT (ten_khong_dau) DO NOTHING;
INSERT INTO public.nguyen_lieu_dong_nghia(ten_goi,ma_nl)
 SELECT v.alias,n.ma_nl FROM ingredient_vocabulary v JOIN public.nguyen_lieu n
 ON n.ten_khong_dau=public.normalize_ingredient_name(v.canonical)
 ON CONFLICT (ten_khong_dau) DO NOTHING;
INSERT INTO public.nguyen_lieu_dong_nghia(ten_goi,ma_nl)
 SELECT ten_nl,ma_nl FROM public.nguyen_lieu ON CONFLICT (ten_khong_dau) DO NOTHING;

-- Canonical names and aliases share a single unique namespace, also under concurrent inserts.
CREATE OR REPLACE FUNCTION app_private.register_ingredient_name() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target bigint;
BEGIN
 INSERT INTO public.nguyen_lieu_dong_nghia(ten_goi,ma_nl) VALUES (NEW.ten_nl,NEW.ma_nl)
 ON CONFLICT (ten_khong_dau) DO UPDATE SET ten_goi=nguyen_lieu_dong_nghia.ten_goi
 RETURNING ma_nl INTO target;
 IF target<>NEW.ma_nl THEN RAISE EXCEPTION 'Ingredient name is already an alias' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.register_ingredient_name() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS register_ingredient_name ON public.nguyen_lieu;
CREATE TRIGGER register_ingredient_name AFTER INSERT OR UPDATE OF ten_nl ON public.nguyen_lieu
 FOR EACH ROW EXECUTE FUNCTION app_private.register_ingredient_name();
-- Prevent editors moving/deleting a canonical name's registry entry.
CREATE OR REPLACE FUNCTION app_private.protect_ingredient_name() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.nguyen_lieu n WHERE n.ten_khong_dau=OLD.ten_khong_dau AND n.ma_nl=OLD.ma_nl)
 AND (TG_OP='DELETE' OR NEW.ma_nl<>OLD.ma_nl OR NEW.ten_goi<>OLD.ten_goi) THEN
 RAISE EXCEPTION 'Canonical name registry entry is required' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_ingredient_name ON public.nguyen_lieu_dong_nghia;
CREATE TRIGGER protect_ingredient_name BEFORE UPDATE OR DELETE ON public.nguyen_lieu_dong_nghia
 FOR EACH ROW EXECUTE FUNCTION app_private.protect_ingredient_name();

ALTER TABLE public.nguyen_lieu_dong_nghia ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.nguyen_lieu_dong_nghia TO anon,authenticated,service_role;
GRANT INSERT,UPDATE,DELETE ON public.nguyen_lieu_dong_nghia TO authenticated,service_role;
DO $$
DECLARE action text; expr text; visibility text; writable text;
BEGIN
 FOREACH action IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
 expr:=CASE WHEN action='SELECT' THEN 'true' ELSE 'app_private.is_admin()' END;
 visibility:=CASE WHEN action='INSERT' THEN '' ELSE ' USING ('||expr||')' END;
 writable:=CASE WHEN action IN ('INSERT','UPDATE') THEN ' WITH CHECK ('||expr||')' ELSE '' END;
 EXECUTE format('DROP POLICY IF EXISTS %I ON public.nguyen_lieu_dong_nghia','dictionary_allow_'||lower(action));
 EXECUTE format('DROP POLICY IF EXISTS %I ON public.nguyen_lieu_dong_nghia','dictionary_limit_'||lower(action));
 EXECUTE format('CREATE POLICY %I ON public.nguyen_lieu_dong_nghia AS PERMISSIVE FOR %s TO anon,authenticated%s%s','dictionary_allow_'||lower(action),action,visibility,writable);
 EXECUTE format('CREATE POLICY %I ON public.nguyen_lieu_dong_nghia AS RESTRICTIVE FOR %s TO anon,authenticated%s%s','dictionary_limit_'||lower(action),action,visibility,writable);
 END LOOP;
END $$;

-- Exact resolution for matching; prefix search for autocomplete (literal %, _ and backslash).
CREATE OR REPLACE FUNCTION public.resolve_ingredient(p_name text) RETURNS bigint
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT ma_nl FROM public.nguyen_lieu_dong_nghia WHERE ten_khong_dau=public.normalize_ingredient_name(p_name)
$$;
CREATE OR REPLACE FUNCTION public.search_ingredients(p_search text DEFAULT '', p_limit integer DEFAULT 20)
RETURNS TABLE(ma_nl bigint,ten_nl text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT n.ma_nl,n.ten_nl FROM public.nguyen_lieu n JOIN (
 SELECT DISTINCT a.ma_nl FROM public.nguyen_lieu_dong_nghia a
 WHERE a.ten_khong_dau LIKE replace(replace(replace(public.normalize_ingredient_name(coalesce(p_search,'')),
 chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%' ESCAPE E'\\'
 ) a USING(ma_nl)
 ORDER BY n.ten_khong_dau=public.normalize_ingredient_name(p_search) DESC,n.ten_nl,n.ma_nl
 LIMIT least(greatest(coalesce(p_limit,20),1),100)
$$;
REVOKE ALL ON FUNCTION public.resolve_ingredient(text),public.search_ingredients(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_ingredient_name(text), public.resolve_ingredient(text),public.search_ingredients(text,integer) TO anon,authenticated,service_role;
-- Install the updated Sprint 1 writer in the same transaction.
create or replace function public.create_post_with_recipe(
  p_dish_id bigint,
  p_title text,
  p_content text,
  p_ingredients jsonb,
  p_steps jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_ct bigint;
  v_post bigint;
  v_item jsonb;
  v_nl bigint;
  v_name text;
begin
  -- Người đăng luôn lấy từ token (auth.uid()), không nhận từ client
  if v_uid is null then
    raise exception 'ERR_UNAUTHORIZED';
  end if;

  select trang_thai into v_status from nguoi_dung where ma_nd = v_uid;
  if v_status is distinct from 'ACTIVE' then
    raise exception 'ERR_FORBIDDEN';
  end if;

  if not exists (select 1 from mon_an where ma_mon = p_dish_id and trang_thai = 'ACTIVE') then
    raise exception 'ERR_DISH_NOT_FOUND';
  end if;

  -- 1. Công thức
  insert into cong_thuc (ma_mon, ma_nguoi_tao, ten_ct)
  values (p_dish_id, v_uid, p_title)
  returning ma_ct into v_ct;

  -- 2. Nguyên liệu (dùng ingredient_id, hoặc tìm/tạo theo tên)
  for v_item in select e from jsonb_array_elements(p_ingredients) as e loop
    v_nl := null;

    if nullif(v_item->>'ingredient_id', '') is not null then
      select ma_nl into v_nl from nguyen_lieu
      where ma_nl = (v_item->>'ingredient_id')::bigint;
      if v_nl is null then
        raise exception 'ERR_INGREDIENT_NOT_FOUND';
      end if;
    else
      v_name := btrim(v_item->>'name');
      -- Dictionary migration adds exact accent-insensitive / synonym resolution.
      -- Keep this standalone Sprint 1 script usable before that migration is installed.
      if to_regprocedure('public.resolve_ingredient(text)') is not null then
        v_nl := public.resolve_ingredient(v_name);
      else
        select ma_nl into v_nl from nguyen_lieu
        where lower(ten_nl) = lower(v_name) limit 1;
      end if;
      if v_nl is null then
        begin
          insert into nguyen_lieu (ten_nl) values (v_name)
          returning ma_nl into v_nl;
        exception when unique_violation then
          -- Concurrent creators may have registered the same name or alias.
          if to_regprocedure('public.resolve_ingredient(text)') is not null then
            v_nl := public.resolve_ingredient(v_name);
          else
            select ma_nl into v_nl from nguyen_lieu where lower(ten_nl)=lower(v_name);
          end if;
          if v_nl is null then raise; end if;
        end;
      end if;
    end if;

    begin
      insert into ct_nguyen_lieu (ma_ct, ma_nl, so_luong, don_vi, vai_tro_nl)
      values (
        v_ct,
        v_nl,
        nullif(v_item->>'quantity', '')::numeric,
        nullif(btrim(v_item->>'unit'), ''),
        coalesce(nullif(v_item->>'role', ''), 'SECONDARY')
      );
    exception when unique_violation then
      raise exception 'ERR_INGREDIENT_DUPLICATE';
    end;
  end loop;

  -- 3. Các bước (stt theo thứ tự mảng)
  insert into buoc_cong_thuc (ma_ct, stt, noi_dung)
  select v_ct, s.ord::int, btrim(s.val->>'content')
  from jsonb_array_elements(p_steps) with ordinality as s(val, ord);

  -- 4. Bài đăng
  insert into bai_dang (ma_tac_gia, loai_bai, ma_ct, tieu_de, noi_dung, trang_thai)
  values (
    v_uid, 'RECIPE', v_ct, p_title,
    coalesce(nullif(btrim(p_content), ''), p_title),
    'PUBLIC'
  )
  returning ma_bai into v_post;

  -- 5. Trả về dữ liệu bài vừa tạo theo đúng cấu trúc contract
  return (
    select jsonb_build_object(
      'id', b.ma_bai,
      'title', b.tieu_de,
      'content', b.noi_dung,
      'created_at', b.tao_luc,
      'dish', jsonb_build_object('id', m.ma_mon, 'name', m.ten_mon),
      'author', jsonb_build_object('id', u.ma_nd, 'display_name', u.ten_hien_thi),
      'ingredients', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'ingredient_id', n.ma_nl,
                 'name', n.ten_nl,
                 'quantity', ci.so_luong,
                 'unit', ci.don_vi,
                 'role', ci.vai_tro_nl
               ) order by ci.vai_tro_nl, n.ten_nl), '[]'::jsonb)
        from ct_nguyen_lieu ci
        join nguyen_lieu n on n.ma_nl = ci.ma_nl
        where ci.ma_ct = v_ct
      ),
      'steps', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'order', s.stt,
                 'content', s.noi_dung
               ) order by s.stt), '[]'::jsonb)
        from buoc_cong_thuc s
        where s.ma_ct = v_ct
      )
    )
    from bai_dang b
    join mon_an m on m.ma_mon = p_dish_id
    join nguoi_dung u on u.ma_nd = b.ma_tac_gia
    where b.ma_bai = v_post
  );
end;
$$;

-- Chỉ người dùng đã đăng nhập mới được gọi
revoke all on function public.create_post_with_recipe(bigint, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.create_post_with_recipe(bigint, text, text, jsonb, jsonb) to authenticated;
NOTIFY pgrst, 'reload schema';
END;
$ingredient_dictionary$;
```

## 7. SQL xác minh sau triển khai

Khối này chỉ đọc dữ liệu, chạy với quyền postgres:

```sql
-- Read-only deployment checks. Run as postgres after the migration.
SELECT ten_khong_dau,count(*) FROM public.nguyen_lieu GROUP BY ten_khong_dau HAVING count(*)>1;
SELECT i.ma_ct,i.ma_nl FROM public.ct_nguyen_lieu i LEFT JOIN public.nguyen_lieu n USING(ma_nl) WHERE n.ma_nl IS NULL;
SELECT h.ma_nd,h.ma_nl FROM public.han_che_nguyen_lieu h LEFT JOIN public.nguyen_lieu n USING(ma_nl) WHERE n.ma_nl IS NULL;
SELECT n.ma_nl,n.ten_nl FROM public.nguyen_lieu n
 LEFT JOIN public.nguyen_lieu_dong_nghia a ON a.ten_khong_dau=n.ten_khong_dau AND a.ma_nl=n.ma_nl
 WHERE a.ma_nl IS NULL;
-- Four queries above must be empty; each test below must be true.
SELECT public.resolve_ingredient('hanh xanh')=public.resolve_ingredient('Hành lá') AS synonym_ok,
 public.resolve_ingredient('hanh la')=public.resolve_ingredient('Hành lá') AS accents_ok;
SELECT * FROM public.search_ingredients('hanh x');
SELECT old_id,canonical_id,original_ingredient->>'ten_nl' AS old_name,merged_at
 FROM app_private.ingredient_merge_audit ORDER BY old_id;
-- Additional ingredient FK tables require review before deploying the merge.
SELECT conrelid::regclass AS referencing_table,pg_get_constraintdef(oid) AS definition
 FROM pg_constraint WHERE contype='f' AND confrelid='public.nguyen_lieu'::regclass;
```

| Kết quả | Điều kiện đạt |
|---|---|
| Truy vấn 1: khóa tên không dấu trùng | Không có dòng. |
| Truy vấn 2: công thức mồ côi | Không có dòng. |
| Truy vấn 3: hạn chế nguyên liệu mồ côi | Không có dòng. |
| Truy vấn 4: thiếu registry cho tên chuẩn | Không có dòng. |
| `synonym_ok`, `accents_ok` | Cả hai là `true`; `NULL` cũng chưa đạt. |
| `search_ingredients('hanh x')` | Có Hành lá với ID chuẩn; không xuất hiện bản ghi nguyên liệu dư cho alias đó. |
| Audit | Có dữ liệu là bình thường. Đối chiếu ID cũ/mới và ghi chú các công thức đã gộp. |
| FK | Có các dòng tham chiếu là bình thường; kiểm tra đủ công thức, hạn chế và alias. |

Số 299 là kết quả snapshot 340 tên cục bộ; không dùng làm ràng buộc bắt buộc nếu dữ liệu đích đã thay đổi.

## 8. DA04 cần rà dữ liệu

Danh sách ánh xạ xử lý những tên đã xác định rõ nghĩa. Chưa thể khẳng định từ điển sạch mọi đồng nghĩa nếu chưa rà các mục sau:

- Tên mơ hồ/nhóm: “Hành”, “Ít hành”, “Rau nêm”, “Rau thơm”, “Gia vị”, “Phở Hạt nêm”, “Bạc hà”. Không tự đoán loài hay thành phần.
- Nhiều nguyên liệu: “Hành lá/ ngò rí”, “Rau mùi/ hành lá”, “Muối/tiêu”, “Đường/ tiêu” và các tổ hợp khác. Cần quyết định là hỗn hợp hay lựa chọn thay thế trước khi tách/gộp.
- Giữ các khác biệt có ý nghĩa: tươi/khô/chiên, loài, phần thịt. Ví dụ Mộc nhĩ khác Mộc nhĩ khô; Tôm tươi khác Tôm khô.
- Tên khác nghĩa nhưng bỏ dấu trùng nhau: không thêm alias “Rau ngò” cho Ngò rí vì khóa `rau ngo` trùng Rau ngổ. Vocabulary migration có kiểm tra unique để dừng nếu ánh xạ mơ hồ.
- Tên mới chưa có trong taxonomy vẫn giữ cách nhập của người dùng; cần tiếp tục biên tập dấu và đồng nghĩa, không tự suy diễn bằng thuật toán.

## 9. Nghiệm thu và bàn giao Jira

| Tiêu chí | Bằng chứng hiện có | Phần còn cần xác nhận |
|---|---|---|
| Không còn tên trùng nghĩa | Nhóm đồng nghĩa đã liệt kê được gộp; snapshot cục bộ 340 → 299. | DA04 rà tên mơ hồ/tổ hợp, xác nhận taxonomy và dữ liệu thật. |
| Không dấu và đồng nghĩa trả đúng | SQL cục bộ PASS, contract và SQL kiểm tra ở mục 2/7. | Cả hai cờ kiểm tra trên Supabase là true; autocomplete trả ID chuẩn. |
| Công thức không mồ côi | Test công thức/hạn chế và snapshot cục bộ PASS. | Các truy vấn mồ côi rỗng, bài cũ hiển thị đúng, thử tạo bài và rà dị ứng trên đích. |
| PR hoặc tài liệu | File bàn giao độc lập này gồm SQL triển khai và kiểm tra đầy đủ. | Đính kèm file này vào Jira; chưa có PR được tạo trong phiên làm việc. |
| Báo TV4 và TV1 | Nội dung thông báo bên dưới. | Người yêu cầu tự gửi. |

Ghi nhận kết quả triển khai sau khi chạy thành công:

| Thông tin | Giá trị cần điền |
|---|---|
| Môi trường Supabase | … |
| Người triển khai và thời điểm | … |
| Số nguyên liệu trước/sau | … |
| Migration và rerun | … |
| Bốn truy vấn kiểm tra đầu | … |
| Hai cờ synonym/accents | … |
| Bài cũ, tạo bài mới, kiểm tra hạn chế | … |
| DA04 xác nhận danh sách cần rà | … |
| TV4 xác nhận contract BE11/DA04 | … |

Nội dung gửi TV4 và TV1:

> TV4, TV1: đính kèm bàn giao từ điển nguyên liệu cho BE11/DA04. File gồm contract RPC, quy tắc gộp, SQL migration nguyên tử đã sửa lỗi guard, SQL kiểm tra và các mục DA04 cần rà. Kiểm thử PostgreSQL cục bộ PASS; snapshot 340 tên gộp còn 299, giữ liên kết công thức/hạn chế, backend 89 test PASS. Cần xác nhận triển khai bản sửa trên Supabase, tải lại cache ID và hoàn tất rà dữ liệu trước khi chốt nghiệm thu. BE11 dùng resolve_ingredient để lấy ID chuẩn và search_ingredients để autocomplete.
