-- Disposable database only: run after fixture.sql, before any migrations.
\set ON_ERROR_STOP on
CREATE UNIQUE INDEX bao_cao_once_post ON public.bao_cao(ma_nguoi_bao_cao,ma_bai) WHERE ma_bai IS NOT NULL;
CREATE UNIQUE INDEX bao_cao_once_comment ON public.bao_cao(ma_nguoi_bao_cao,ma_bl) WHERE ma_bl IS NOT NULL;
CREATE UNIQUE INDEX thuoc_tinh_normalized_unique ON public.thuoc_tinh_mon(lower(btrim(nhom_tt)),lower(btrim(gia_tri)));
CREATE UNIQUE INDEX nguyen_lieu_normalized_unique ON public.nguyen_lieu(lower(btrim(ten_nl)));
CREATE UNIQUE INDEX quan_an_exact_unique ON public.quan_an(lower(btrim(ten_quan)),vi_do,kinh_do) WHERE trang_thai<>'DELETED';
CREATE TEMP TABLE original_requirement_indexes AS
SELECT oid,relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN (
  'bao_cao_once_post','bao_cao_once_comment','thuoc_tinh_normalized_unique','nguyen_lieu_normalized_unique','quan_an_exact_unique'
);
\ir ../migrations/202611110001_integrity.sql

BEGIN;
DO $$ BEGIN
  IF (SELECT count(*) FROM original_requirement_indexes o JOIN pg_class c ON c.oid=o.oid AND c.relname=o.relname)<>5 THEN
    RAISE EXCEPTION 'Existing matching indexes were replaced instead of reused';
  END IF;
END $$;

CREATE INDEX requirements_test_nonunique ON public.bao_cao(ma_nguoi_bao_cao,ma_bai) WHERE ma_bai IS NOT NULL;
CREATE UNIQUE INDEX requirements_test_predicate ON public.bao_cao(ma_nguoi_bao_cao,ma_bai) WHERE ma_bl IS NOT NULL;
CREATE UNIQUE INDEX requirements_test_columns ON public.bao_cao(ma_bai,ma_nguoi_bao_cao) WHERE ma_bai IS NOT NULL;
CREATE TABLE public.requirements_test_relation(n integer);
CREATE INDEX requirements_test_wrong_table ON public.requirements_test_relation(n);
CREATE TABLE public.requirements_test_duplicates(n integer);
INSERT INTO public.requirements_test_duplicates VALUES (1),(1);

DO $$
DECLARE test_name text;
BEGIN
  FOREACH test_name IN ARRAY ARRAY[
    'requirements_test_nonunique','requirements_test_predicate','requirements_test_columns',
    'requirements_test_relation','requirements_test_wrong_table'
  ] LOOP
    BEGIN
      PERFORM pg_temp.requirements_ensure_index(test_name,'public.bao_cao','ma_nguoi_bao_cao,ma_bai',true,'ma_bai IS NOT NULL');
      RAISE EXCEPTION 'Conflicting relation % unexpectedly accepted',test_name;
    EXCEPTION WHEN SQLSTATE '55000' THEN
      IF to_regclass('public.'||test_name) IS NULL THEN RAISE EXCEPTION 'Conflicting relation was removed'; END IF;
    END;
  END LOOP;
  BEGIN
    PERFORM pg_temp.requirements_ensure_index('requirements_test_duplicate_index','public.requirements_test_duplicates','n',true);
    RAISE EXCEPTION 'Duplicate rows unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN
    IF (SELECT count(*) FROM public.requirements_test_duplicates)<>2 THEN RAISE EXCEPTION 'Duplicate rows were changed'; END IF;
  END;
END $$;
ROLLBACK;
