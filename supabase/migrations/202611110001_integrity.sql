-- Upgrade the existing 18-table schema; do not use this as a baseline.
-- Run once, as postgres, after audit.sql. Invalid existing data aborts atomically.
BEGIN;

-- Hosted schemas may already contain these indexes. Reuse only matching, valid
-- definitions; IF NOT EXISTS alone would silently accept a weaker index.
-- This helper lives only in the current SQL Editor/psql session.
CREATE OR REPLACE FUNCTION pg_temp.requirements_ensure_index(
  index_name text, target_table regclass, key_sql text, is_unique boolean,
  predicate_sql text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
  existing oid:=to_regclass(format('public.%I',index_name));
  expected oid;
  matches boolean;
  create_sql text:=format('CREATE %s INDEX %I ON %s (%s)%s',
    CASE WHEN is_unique THEN 'UNIQUE' ELSE '' END,index_name,target_table,key_sql,
    CASE WHEN predicate_sql IS NULL THEN '' ELSE ' WHERE '||predicate_sql END);
BEGIN
  IF existing IS NULL THEN
    EXECUTE create_sql;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index WHERE indexrelid=existing AND indrelid=target_table) THEN
    RAISE EXCEPTION 'Existing public.% is not an index on %',index_name,target_table
      USING ERRCODE='55000',HINT='Inspect the existing relation; do not drop it just to rerun this migration.';
  END IF;

  -- Build the intended definition on an empty temporary copy so PostgreSQL
  -- canonicalizes expressions, casts, predicates, collation and operator classes.
  EXECUTE format('CREATE TEMP TABLE requirements_index_reference (LIKE %s) ON COMMIT DROP',target_table);
  EXECUTE format('CREATE %s INDEX requirements_index_reference_idx ON pg_temp.requirements_index_reference (%s)%s',
    CASE WHEN is_unique THEN 'UNIQUE' ELSE '' END,key_sql,
    CASE WHEN predicate_sql IS NULL THEN '' ELSE ' WHERE '||predicate_sql END);
  expected:=to_regclass('pg_temp.requirements_index_reference_idx');
  SELECT a.indisvalid AND a.indisready AND a.indislive
    AND a.indisunique=e.indisunique AND a.indimmediate=e.indimmediate
    AND a.indnullsnotdistinct=e.indnullsnotdistinct
    AND a.indnatts=e.indnatts AND a.indnkeyatts=e.indnkeyatts
    AND ac.relam=ec.relam AND a.indcollation=e.indcollation
    AND a.indclass=e.indclass AND a.indoption=e.indoption
    AND pg_get_expr(a.indpred,a.indrelid) IS NOT DISTINCT FROM pg_get_expr(e.indpred,e.indrelid)
    AND NOT EXISTS (
      SELECT 1 FROM generate_series(1,e.indnatts) k
      WHERE pg_get_indexdef(a.indexrelid,k,false) IS DISTINCT FROM pg_get_indexdef(e.indexrelid,k,false)
    ) INTO matches
  FROM pg_catalog.pg_index a JOIN pg_catalog.pg_class ac ON ac.oid=a.indexrelid
    CROSS JOIN pg_catalog.pg_index e JOIN pg_catalog.pg_class ec ON ec.oid=e.indexrelid
  WHERE a.indexrelid=existing AND e.indexrelid=expected;
  DROP TABLE pg_temp.requirements_index_reference;
  IF matches IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Existing public.% has a different definition or is not a valid, ready index',index_name
      USING ERRCODE='55000',DETAIL='Existing: '||pg_get_indexdef(existing)||E'\nExpected: '||create_sql,
        HINT='Review this conflict before changing or replacing the existing index.';
  END IF;
  RAISE NOTICE 'Reusing existing matching index public.%',index_name;
END $$;

ALTER TABLE public.cong_thuc ADD COLUMN IF NOT EXISTS trang_thai text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.cong_thuc ADD CONSTRAINT cong_thuc_visibility CHECK (trang_thai IN ('ACTIVE','HIDDEN','DELETED'));

-- PostgreSQL CHECK accepts NULL: use explicit IS NOT NULL for required links.
ALTER TABLE public.bai_dang ADD CONSTRAINT bai_dang_target CHECK (
  (loai_bai = 'RECIPE' AND ma_quan IS NULL AND ma_mon_da_dung IS NULL AND gia_da_tra IS NULL
    AND (trang_thai = 'DRAFT' OR ma_ct IS NOT NULL))
  OR (loai_bai = 'REVIEW' AND ma_ct IS NULL AND (trang_thai = 'DRAFT' OR ma_quan IS NOT NULL))
);
ALTER TABLE public.tep_dinh_kem ADD CONSTRAINT tep_one_target CHECK (num_nonnulls(ma_bai,ma_bl)=1);
ALTER TABLE public.bao_cao ADD CONSTRAINT bao_cao_one_target CHECK (num_nonnulls(ma_bai,ma_bl)=1);
ALTER TABLE public.bao_cao ADD CONSTRAINT bao_cao_resolution CHECK (
  (trang_thai='PENDING' AND num_nonnulls(ma_nguoi_xu_ly,thoi_diem_xu_ly,ly_do_xu_ly)=0)
  OR (trang_thai IN ('RESOLVED','DISMISSED') AND ma_nguoi_xu_ly IS NOT NULL
    AND thoi_diem_xu_ly IS NOT NULL AND ly_do_xu_ly IS NOT NULL AND ly_do_xu_ly ~ '[^[:space:]]')
);
SELECT pg_temp.requirements_ensure_index('bao_cao_once_post','public.bao_cao','ma_nguoi_bao_cao,ma_bai',true,'ma_bai IS NOT NULL');
SELECT pg_temp.requirements_ensure_index('bao_cao_once_comment','public.bao_cao','ma_nguoi_bao_cao,ma_bl',true,'ma_bl IS NOT NULL');
SELECT pg_temp.requirements_ensure_index('thuoc_tinh_normalized_unique','public.thuoc_tinh_mon','lower(btrim(nhom_tt)),lower(btrim(gia_tri))',true);
SELECT pg_temp.requirements_ensure_index('nguyen_lieu_normalized_unique','public.nguyen_lieu','lower(btrim(ten_nl))',true);
-- Exact duplicates are rejected; nearby candidates are returned separately (no invented distance threshold).
SELECT pg_temp.requirements_ensure_index('quan_an_exact_unique','public.quan_an','lower(btrim(ten_quan)),vi_do,kinh_do',true,'trang_thai <> ''DELETED''');

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('nguoi_dung','vai_tro',ARRAY['USER','ADMIN']),('nguoi_dung','trang_thai',ARRAY['ACTIVE','LOCKED']),
    ('mon_an','trang_thai',ARRAY['ACTIVE','HIDDEN','DELETED']),('quan_an','trang_thai',ARRAY['ACTIVE','HIDDEN','DELETED']),
    ('han_che_nguyen_lieu','loai_han_che',ARRAY['ALLERGY','AVOID']),
    ('cong_thuc','trang_thai_thanh_phan',ARRAY['COMPLETE','INCOMPLETE']),
    ('ct_nguyen_lieu','vai_tro_nl',ARRAY['PRIMARY','SECONDARY']),
    ('bai_dang','loai_bai',ARRAY['RECIPE','REVIEW']),('bai_dang','trang_thai',ARRAY['DRAFT','PUBLIC','HIDDEN','DELETED']),
    ('binh_luan','trang_thai',ARRAY['PUBLIC','HIDDEN','DELETED']),('cam_xuc','loai_cam_xuc',ARRAY['LIKE','DISLIKE']),
    ('tep_dinh_kem','loai_tep',ARRAY['IMAGE','VIDEO']),('bao_cao','trang_thai',ARRAY['PENDING','RESOLVED','DISMISSED'])
  ) AS domains(t,c,allowed) LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I = ANY (%L::text[]))',
      r.t,r.t||'_'||r.c||'_domain',r.c,r.allowed);
  END LOOP;
  FOR r IN SELECT * FROM (VALUES
    ('nguoi_dung','ten_hien_thi'),('mon_an','ten_mon'),('nguyen_lieu','ten_nl'),
    ('thuoc_tinh_mon','nhom_tt'),('thuoc_tinh_mon','gia_tri'),('cong_thuc','ten_ct'),
    ('quan_an','ten_quan'),('quan_an','dia_chi'),('bai_dang','tieu_de'),
    ('bai_dang','noi_dung'),('binh_luan','noi_dung'),('buoc_cong_thuc','noi_dung'),
    ('bao_cao','ly_do'),('tep_dinh_kem','duong_dan_storage')
  ) AS fields(t,c) LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NOT NULL AND %I ~ ''[^[:space:]]'')',
      r.t,r.t||'_'||r.c||'_nonblank',r.c,r.c);
  END LOOP;
END $$;
ALTER TABLE public.cong_thuc ADD CONSTRAINT recipe_time_positive CHECK (thoi_gian_phut>0);
ALTER TABLE public.ct_nguyen_lieu ADD CONSTRAINT ingredient_quantity_positive CHECK (so_luong>0 AND so_luong<'Infinity'::numeric);
ALTER TABLE public.buoc_cong_thuc ADD CONSTRAINT recipe_step_positive CHECK (stt>0);
ALTER TABLE public.thuc_don ADD CONSTRAINT menu_price_nonnegative CHECK (gia_ban>=0 AND gia_ban<'Infinity'::numeric);
ALTER TABLE public.bai_dang ADD CONSTRAINT review_price_nonnegative CHECK (gia_da_tra>=0 AND gia_da_tra<'Infinity'::numeric);
ALTER TABLE public.quan_an ADD CONSTRAINT restaurant_coordinates CHECK (vi_do BETWEEN -90 AND 90 AND kinh_do BETWEEN -180 AND 180);
ALTER TABLE public.tep_dinh_kem ADD CONSTRAINT attachment_order_nonnegative CHECK (thu_tu>=0);

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

-- Cross-table invariants also apply to trusted API writes (RLS is bypassed by service_role).
CREATE FUNCTION app_private.validate_relations() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE state text; role_name text; account_state text;
BEGIN
  IF TG_TABLE_NAME='cam_xuc' OR (TG_TABLE_NAME='binh_luan' AND (TG_OP='INSERT' OR to_jsonb(NEW)->>'trang_thai'='PUBLIC')) THEN
    SELECT trang_thai INTO state FROM public.bai_dang WHERE ma_bai=NEW.ma_bai FOR SHARE;
    IF state IS DISTINCT FROM 'PUBLIC' THEN RAISE EXCEPTION 'Post is not public' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='bao_cao' AND NEW.trang_thai<>'PENDING' THEN
    -- Validate at decision time; demoting a moderator later must not invalidate history.
    IF TG_OP='INSERT' OR (NEW.ma_nguoi_xu_ly,NEW.trang_thai) IS DISTINCT FROM (OLD.ma_nguoi_xu_ly,OLD.trang_thai) THEN
      SELECT vai_tro,trang_thai INTO role_name,account_state FROM public.nguoi_dung WHERE ma_nd=NEW.ma_nguoi_xu_ly FOR SHARE;
      IF role_name IS DISTINCT FROM 'ADMIN' OR account_state IS DISTINCT FROM 'ACTIVE' THEN
        RAISE EXCEPTION 'Resolver must be an active admin' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_relations BEFORE INSERT OR UPDATE ON public.cam_xuc FOR EACH ROW EXECUTE FUNCTION app_private.validate_relations();
CREATE TRIGGER validate_relations BEFORE INSERT OR UPDATE ON public.binh_luan FOR EACH ROW EXECUTE FUNCTION app_private.validate_relations();
CREATE TRIGGER validate_relations BEFORE INSERT OR UPDATE ON public.bao_cao FOR EACH ROW EXECUTE FUNCTION app_private.validate_relations();

-- Serialize ingredient/step edits against the recipe row, including concurrent completion.
CREATE FUNCTION app_private.lock_recipe() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.ma_ct <> OLD.ma_ct THEN
    PERFORM 1 FROM public.cong_thuc WHERE ma_ct IN (OLD.ma_ct,NEW.ma_ct) ORDER BY ma_ct FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.cong_thuc WHERE ma_ct=CASE WHEN TG_OP='DELETE' THEN OLD.ma_ct ELSE NEW.ma_ct END FOR UPDATE;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lock_recipe BEFORE INSERT OR UPDATE OR DELETE ON public.ct_nguyen_lieu FOR EACH ROW EXECUTE FUNCTION app_private.lock_recipe();
CREATE TRIGGER lock_recipe BEFORE INSERT OR UPDATE OR DELETE ON public.buoc_cong_thuc FOR EACH ROW EXECUTE FUNCTION app_private.lock_recipe();

-- COMPLETE certifies ingredient information, not allergy safety or completeness of preparation instructions.
-- Explicitly mark COMPLETE only after author review; never automatically upgrade incomplete data.
CREATE FUNCTION app_private.refresh_ingredient_completeness() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ids bigint[]; target bigint;
BEGIN
  IF TG_TABLE_NAME='cong_thuc' THEN ids:=ARRAY[NEW.ma_ct];
  ELSIF TG_OP='INSERT' THEN ids:=ARRAY[NEW.ma_ct];
  ELSIF TG_OP='DELETE' THEN ids:=ARRAY[OLD.ma_ct];
  ELSE ids:=ARRAY[OLD.ma_ct,NEW.ma_ct]; END IF;
  FOREACH target IN ARRAY ids LOOP
    UPDATE public.cong_thuc c SET trang_thai_thanh_phan='INCOMPLETE'
    WHERE c.ma_ct=target AND c.trang_thai_thanh_phan='COMPLETE' AND (
      NOT EXISTS (SELECT 1 FROM public.ct_nguyen_lieu i WHERE i.ma_ct=c.ma_ct)
      OR EXISTS (SELECT 1 FROM public.ct_nguyen_lieu i WHERE i.ma_ct=c.ma_ct AND NOT (
        (i.so_luong IS NOT NULL AND i.so_luong>0 AND coalesce(i.don_vi ~ '[^[:space:]]',false))
        OR (i.so_luong IS NULL AND coalesce(i.ghi_chu ~ '[^[:space:]]',false))
      ))
    );
  END LOOP;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER refresh_ingredient_completeness AFTER INSERT OR UPDATE ON public.cong_thuc
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app_private.refresh_ingredient_completeness();
CREATE CONSTRAINT TRIGGER refresh_ingredient_completeness AFTER INSERT OR UPDATE OR DELETE ON public.ct_nguyen_lieu
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app_private.refresh_ingredient_completeness();
CREATE FUNCTION app_private.stamp_edit() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_TABLE_NAME='thuc_don' THEN NEW.cap_nhat_luc:=clock_timestamp();
  ELSE NEW.sua_luc:=clock_timestamp(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stamp_edit BEFORE UPDATE ON public.bai_dang FOR EACH ROW EXECUTE FUNCTION app_private.stamp_edit();
CREATE TRIGGER stamp_edit BEFORE UPDATE ON public.binh_luan FOR EACH ROW EXECUTE FUNCTION app_private.stamp_edit();
CREATE TRIGGER stamp_edit BEFORE UPDATE ON public.thuc_don FOR EACH ROW EXECUTE FUNCTION app_private.stamp_edit();

CREATE INDEX IF NOT EXISTS bai_dang_public_recent ON public.bai_dang(tao_luc DESC) WHERE trang_thai='PUBLIC';
CREATE INDEX IF NOT EXISTS binh_luan_post ON public.binh_luan(ma_bai);
CREATE INDEX IF NOT EXISTS ct_nguyen_lieu_ingredient ON public.ct_nguyen_lieu(ma_nl,ma_ct);
CREATE INDEX IF NOT EXISTS cong_thuc_dish ON public.cong_thuc(ma_mon);
CREATE INDEX IF NOT EXISTS thuc_don_dish_price ON public.thuc_don(ma_mon,gia_ban);
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;

-- Keep the backfill after ALL schema/index changes. Even a no-op UPDATE queues
-- deferred completeness events, which block later CREATE INDEX on cong_thuc.
-- Existing unsupported claims become INCOMPLETE when the transaction commits.
UPDATE public.cong_thuc SET trang_thai_thanh_phan=trang_thai_thanh_phan WHERE trang_thai_thanh_phan='COMPLETE';
COMMIT;
