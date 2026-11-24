-- Read-only preflight; run as postgres in Supabase SQL Editor and save the results.
-- API OpenAPI describes columns/FKs, not CHECKs, triggers, RLS or function bodies.
SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;

SELECT c.conrelid::regclass AS table_name,c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY 1,2;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1,2;
SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY 1,2;
SELECT t.tgrelid::regclass AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','auth') AND NOT t.tgisinternal ORDER BY 1,2;
-- Review ALL exposed SECURITY DEFINER functions; a read RPC may bypass RLS.
SELECT p.oid::regprocedure AS function_name,p.prosecdef AS security_definer,p.proacl AS privileges,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prokind='f' ORDER BY 1;

SELECT 'post_target_mismatch' AS issue,count(*) AS affected FROM public.bai_dang WHERE NOT (
 (loai_bai='RECIPE' AND ma_quan IS NULL AND ma_mon_da_dung IS NULL AND gia_da_tra IS NULL AND (trang_thai='DRAFT' OR ma_ct IS NOT NULL))
 OR (loai_bai='REVIEW' AND ma_ct IS NULL AND (trang_thai='DRAFT' OR ma_quan IS NOT NULL)))
UNION ALL SELECT 'attachment_target_mismatch',count(*) FROM public.tep_dinh_kem WHERE num_nonnulls(ma_bai,ma_bl)<>1
UNION ALL SELECT 'report_target_mismatch',count(*) FROM public.bao_cao WHERE num_nonnulls(ma_bai,ma_bl)<>1
UNION ALL SELECT 'report_resolution_metadata',count(*) FROM public.bao_cao WHERE NOT (
 (trang_thai='PENDING' AND num_nonnulls(ma_nguoi_xu_ly,thoi_diem_xu_ly,ly_do_xu_ly)=0)
 OR (trang_thai IN ('RESOLVED','DISMISSED') AND ma_nguoi_xu_ly IS NOT NULL AND thoi_diem_xu_ly IS NOT NULL
   AND ly_do_xu_ly IS NOT NULL AND ly_do_xu_ly ~ '[^[:space:]]'))
UNION ALL SELECT 'duplicate_post_reports',count(*) FROM (SELECT 1 FROM public.bao_cao WHERE ma_bai IS NOT NULL GROUP BY ma_nguoi_bao_cao,ma_bai HAVING count(*)>1) x
UNION ALL SELECT 'duplicate_comment_reports',count(*) FROM (SELECT 1 FROM public.bao_cao WHERE ma_bl IS NOT NULL GROUP BY ma_nguoi_bao_cao,ma_bl HAVING count(*)>1) x
UNION ALL SELECT 'duplicate_attributes',count(*) FROM (SELECT 1 FROM public.thuoc_tinh_mon GROUP BY lower(btrim(nhom_tt)),lower(btrim(gia_tri)) HAVING count(*)>1) x
UNION ALL SELECT 'duplicate_ingredients',count(*) FROM (SELECT 1 FROM public.nguyen_lieu GROUP BY lower(btrim(ten_nl)) HAVING count(*)>1) x
UNION ALL SELECT 'duplicate_exact_restaurants',count(*) FROM (SELECT 1 FROM public.quan_an WHERE trang_thai<>'DELETED' GROUP BY lower(btrim(ten_quan)),vi_do,kinh_do HAVING count(*)>1) x
UNION ALL SELECT 'dishes_ineligible_for_suggestions',count(*) FROM public.mon_an
 WHERE trang_thai='ACTIVE' AND (NOT coalesce(hinh_anh ~ '[^[:space:]]',false) OR NOT coalesce(mo_ta_ngan ~ '[^[:space:]]',false));

-- Generic blank-field findings without exposing personal profile/content values.
DO $$ DECLARE r record; total bigint; BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('nguoi_dung','ten_hien_thi'),('mon_an','ten_mon'),('nguyen_lieu','ten_nl'),('thuoc_tinh_mon','nhom_tt'),('thuoc_tinh_mon','gia_tri'),
    ('cong_thuc','ten_ct'),('quan_an','ten_quan'),('quan_an','dia_chi'),('bai_dang','tieu_de'),('bai_dang','noi_dung'),
    ('binh_luan','noi_dung'),('buoc_cong_thuc','noi_dung'),('bao_cao','ly_do'),('tep_dinh_kem','duong_dan_storage')
  ) AS fields(t,c) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I IS NULL OR %I !~ ''[^[:space:]]''',r.t,r.c,r.c) INTO total;
    IF total>0 THEN RAISE NOTICE 'Blank %.%: % rows',r.t,r.c,total; END IF;
  END LOOP;
END $$;
