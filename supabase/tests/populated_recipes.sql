-- Disposable database only: run after fixture.sql, before any migrations.
-- Existing COMPLETE rows must not leave pending events before CREATE INDEX.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.mon_an(ma_mon,ten_mon,mo_ta_ngan,hinh_anh)
VALUES (900001,'Migration test dish','Existing recipe data','migration-test.jpg');
INSERT INTO public.nguyen_lieu(ma_nl,ten_nl) VALUES (900001,'Migration test ingredient');
INSERT INTO public.cong_thuc(ma_ct,ma_mon,ten_ct,trang_thai_thanh_phan) VALUES
 (900001,900001,'Missing ingredients','COMPLETE'),
 (900002,900001,'Quantified ingredients','COMPLETE'),
 (900003,900001,'Missing unit','COMPLETE'),
 (900004,900001,'Explicitly unspecified quantity','COMPLETE'),
 (900005,900001,'Author has not certified completeness','INCOMPLETE');
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,ghi_chu) VALUES
 (900002,900001,100,'g',NULL),
 (900003,900001,100,NULL,NULL),
 (900004,900001,NULL,NULL,'tùy khẩu vị'),
 (900005,900001,100,'g',NULL);
COMMIT;

\ir ../migrations/202611110001_integrity.sql

DO $$ BEGIN
  IF (SELECT array_agg(trang_thai_thanh_phan ORDER BY ma_ct) FROM public.cong_thuc WHERE ma_ct BETWEEN 900001 AND 900005)
      IS DISTINCT FROM ARRAY['INCOMPLETE','COMPLETE','INCOMPLETE','COMPLETE','INCOMPLETE']::text[] THEN
    RAISE EXCEPTION 'Existing recipe completeness was not reconciled correctly at commit';
  END IF;
  IF to_regclass('public.cong_thuc_dish') IS NULL THEN
    RAISE EXCEPTION 'Recipe index was not created';
  END IF;
  IF (SELECT count(*) FROM public.cong_thuc WHERE ma_ct BETWEEN 900001 AND 900005)<>5
      OR (SELECT count(*) FROM public.ct_nguyen_lieu WHERE ma_ct BETWEEN 900001 AND 900005)<>4 THEN
    RAISE EXCEPTION 'Migration changed the existing recipe/ingredient row count';
  END IF;
END $$;

-- Remove only the synthetic fixture rows, allowing requirements.sql to follow.
BEGIN;
DELETE FROM public.ct_nguyen_lieu WHERE ma_ct BETWEEN 900001 AND 900005;
DELETE FROM public.cong_thuc WHERE ma_ct BETWEEN 900001 AND 900005;
DELETE FROM public.nguyen_lieu WHERE ma_nl=900001;
DELETE FROM public.mon_an WHERE ma_mon=900001;
COMMIT;
