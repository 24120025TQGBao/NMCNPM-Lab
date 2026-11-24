-- Disposable EMPTY database only. Never run fixtures on production.
\set ON_ERROR_STOP on
\ir fixture.sql
\ir ../apply.sql
-- Prove rerunnable installation.
\ir ../migrations/202611220001_dish_matching.sql
CREATE FUNCTION pg_temp.assert_ok(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; END $$;
BEGIN;
INSERT INTO public.nguyen_lieu(ma_nl,ten_nl,la_gia_vi_co_ban) VALUES
 (800001,'QA Trứng',false),(800002,'QA Cà chua',false),
 (800003,'QA Muối',true),(800004,'QA Dầu ăn',true);
INSERT INTO public.mon_an(ma_mon,ten_mon,trang_thai) VALUES
 (800001,'QA Trứng cà chua','ACTIVE'),(800002,'QA Chưa rà','ACTIVE'),
 (800003,'QA Không công thức','ACTIVE'),(800004,'QA Món ẩn','HIDDEN'),
 (800005,'QA Thiếu hướng dẫn','ACTIVE');
INSERT INTO public.cong_thuc(ma_ct,ma_mon,ten_ct,thoi_gian_phut,trang_thai_thanh_phan) VALUES
 (800001,800001,'QA Đủ dữ liệu',10,'COMPLETE'),
 (800002,800002,'QA Chưa chứng nhận',10,'INCOMPLETE'),
 (800004,800004,'QA Ẩn',10,'COMPLETE'),
 (800005,800005,'QA Thiếu bước',10,'COMPLETE'),
 (800006,800001,'QA Điểm cao nhưng chưa rà',10,'INCOMPLETE');
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,vai_tro_nl)
 SELECT 800001,id,1,'g',role FROM (VALUES
 (800001,'PRIMARY'),(800002,'PRIMARY'),(800003,'SECONDARY'),(800004,'SECONDARY')) v(id,role);
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,vai_tro_nl)
 SELECT id,800001,1,'g','PRIMARY' FROM unnest(ARRAY[800002,800004,800005,800006]) id;
INSERT INTO public.buoc_cong_thuc(ma_ct,stt,noi_dung)
 SELECT id,1,'Nấu chín' FROM unnest(ARRAY[800001,800002,800004,800006]) id;
SET CONSTRAINTS ALL IMMEDIATE;
SET LOCAL ROLE anon;
-- Five hand-calculated ingredient sets: denominator 2+2+1+1=6.
DO $$
DECLARE t record; r record;
BEGIN
 FOR t IN SELECT * FROM (VALUES
   ('{}'::bigint[],0::numeric,4,'NEED_SHOPPING'),
   (ARRAY[800001]::bigint[],33.33,3,'NEED_SHOPPING'),
   (ARRAY[800001,800002]::bigint[],66.67,2,'MISSING_1_2'),
   (ARRAY[800001,800002,800003]::bigint[],83.33,1,'MISSING_1_2'),
   (ARRAY[800001,800002,800003,800004]::bigint[],100,0,'COOK_NOW')
 ) v(ids,score,missing,status) LOOP
   SELECT * INTO STRICT r FROM public.match_dishes(t.ids) WHERE ma_mon=800001;
   PERFORM pg_temp.assert_ok(r.match_percent=t.score AND r.missing_count=t.missing
     AND r.readiness=t.status AND NOT r.is_incomplete AND r.ma_ct=800001
     AND jsonb_array_length(r.missing_ingredients)=t.missing,'hand case '||t.ids::text);
   PERFORM pg_temp.assert_ok(
     ARRAY(SELECT (x->>'ma_nl')::bigint FROM jsonb_array_elements(r.missing_ingredients) x)
     = ARRAY(SELECT id::bigint FROM generate_series(800001,800004) id WHERE NOT id=ANY(t.ids)),
     'exact missing IDs '||t.ids::text);
 END LOOP;
END $$;
SELECT pg_temp.assert_ok(match_percent=100 AND readiness='COOK_NOW' AND total_weight=6,
 'pantry union and duplicate IDs') FROM public.match_dishes(ARRAY[800001,800001,800002],true) WHERE ma_mon=800001;
SELECT pg_temp.assert_ok(match_percent=100 AND is_incomplete AND readiness='INCOMPLETE',
 '100 percent incomplete cannot cook') FROM public.match_dishes(ARRAY[800001]) WHERE ma_mon=800002;
SELECT pg_temp.assert_ok(match_percent IS NULL AND ma_ct IS NULL AND is_incomplete AND readiness='INCOMPLETE',
 'no recipe unknown score') FROM public.match_dishes('{}') WHERE ma_mon=800003;
SELECT pg_temp.assert_ok(is_incomplete AND readiness='INCOMPLETE',
 'missing steps') FROM public.match_dishes(ARRAY[800001]) WHERE ma_mon=800005;
SELECT pg_temp.assert_ok(NOT EXISTS(SELECT 1 FROM public.match_dishes('{}') WHERE ma_mon=800004),'hidden dish');
SELECT pg_temp.assert_ok((SELECT count(*) FROM public.match_dishes('{}',false,1,1))=1,'pagination');
DO $$
DECLARE ids bigint[];
BEGIN
 FOREACH ids SLICE 1 IN ARRAY ARRAY[ARRAY[NULL::bigint],ARRAY[99999999::bigint]] LOOP
   BEGIN PERFORM public.match_dishes(ids); RAISE EXCEPTION 'invalid accepted';
   EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 END LOOP;
 BEGIN PERFORM public.match_dishes(NULL); RAISE EXCEPTION 'NULL accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.match_dishes('{}',false,0); RAISE EXCEPTION 'bad limit accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
-- Even privileged callers must not receive hidden recipes or dishes.
UPDATE public.cong_thuc SET trang_thai='HIDDEN' WHERE ma_ct=800001;
SELECT pg_temp.assert_ok(ma_ct=800006 AND readiness='INCOMPLETE','hidden recipe excluded even as postgres')
 FROM public.match_dishes(ARRAY[800001]) WHERE ma_mon=800001;
-- Restrictions remain effective when pantry availability is assumed.
INSERT INTO auth.users VALUES ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.nguoi_dung(ma_nd) VALUES ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.han_che_nguyen_lieu VALUES ('33333333-3333-4333-8333-333333333333',800001,'ALLERGY');
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_ok(NOT EXISTS(SELECT 1 FROM public.match_dishes(ARRAY[800001],true)
 WHERE ma_mon IN (800001,800002,800005)),'allergy excludes all affected recipes');
RESET ROLE;
ROLLBACK;
\echo 'PASS dish matching: 5 hand cases, pantry, completeness, visibility, restrictions, validation, rerun'
