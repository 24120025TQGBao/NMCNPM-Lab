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
