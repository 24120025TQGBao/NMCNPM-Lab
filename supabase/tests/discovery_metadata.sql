-- psql only. Run against an EMPTY DISPOSABLE database as superuser.
\set ON_ERROR_STOP on
\ir fixture.sql
\ir ../migrations/202611110001_integrity.sql
\ir ../migrations/202611110002_access.sql
\ir ../migrations/202611110003_moderation.sql
\ir ../migrations/202611110004_queries.sql

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003');
INSERT INTO public.nguoi_dung(ma_nd, vai_tro, trang_thai) VALUES
 ('00000000-0000-0000-0000-000000000001','USER','ACTIVE'),
 ('00000000-0000-0000-0000-000000000002','ADMIN','ACTIVE'),
 ('00000000-0000-0000-0000-000000000003','ADMIN','LOCKED');
INSERT INTO public.mon_an(ma_mon,ten_mon,trang_thai) VALUES (1,'Existing dish','ACTIVE'),(2,'Hidden dish','HIDDEN');
INSERT INTO public.nguyen_lieu(ma_nl,ten_nl) VALUES (1,'Rice'),(2,'Salt');
INSERT INTO public.cong_thuc(ma_ct,ma_mon,ten_ct) VALUES (1,1,'Existing recipe');
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,vai_tro_nl) VALUES
 (1,1,100,'g','PRIMARY'),(1,2,1,'g','SECONDARY');
CREATE TEMP TABLE original_rows AS
 SELECT 'dish' AS kind, to_jsonb(m) AS data FROM public.mon_an m
 UNION ALL SELECT 'ingredient',to_jsonb(n) FROM public.nguyen_lieu n
 UNION ALL SELECT 'recipe',to_jsonb(c) FROM public.cong_thuc c
 UNION ALL SELECT 'role',to_jsonb(i) FROM public.ct_nguyen_lieu i;
\ir ../migrations/202611210001_discovery_metadata.sql
INSERT INTO public.tag(ma_tag,slug,ten_tag) VALUES (1,'bua-sang','Bữa sáng'),(2,'an-nhanh','Ăn nhanh');
SELECT setval('public.tag_ma_tag_seq', 2);
INSERT INTO public.mon_an_tag VALUES (1,1),(1,2),(2,1);
UPDATE public.mon_an SET vung_mien='BAC' WHERE ma_mon=1;
UPDATE public.nguyen_lieu SET la_gia_vi_co_ban=true WHERE ma_nl=2;
-- Rerun over populated new tables and curated values as well as legacy data.
\ir ../migrations/202611210001_discovery_metadata.sql
BEGIN;
CREATE FUNCTION public.test_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; END $$;
CREATE FUNCTION public.test_reject(statement text,expected_state text,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=expected_state THEN RETURN; END IF;
    RAISE EXCEPTION 'FAIL: %, expected %, got %: %',label,expected_state,SQLSTATE,SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL: %, statement unexpectedly succeeded',label;
END $$;
SELECT test_assert(NOT EXISTS (
 (SELECT * FROM original_rows EXCEPT
   (SELECT 'dish',to_jsonb(m)-'vung_mien' FROM mon_an m
    UNION ALL SELECT 'ingredient',to_jsonb(n)-'la_gia_vi_co_ban' FROM nguyen_lieu n
    UNION ALL SELECT 'recipe',to_jsonb(c) FROM cong_thuc c
    UNION ALL SELECT 'role',to_jsonb(i) FROM ct_nguyen_lieu i))
 UNION ALL
 ((SELECT 'dish',to_jsonb(m)-'vung_mien' FROM mon_an m
    UNION ALL SELECT 'ingredient',to_jsonb(n)-'la_gia_vi_co_ban' FROM nguyen_lieu n
    UNION ALL SELECT 'recipe',to_jsonb(c) FROM cong_thuc c
    UNION ALL SELECT 'role',to_jsonb(i) FROM ct_nguyen_lieu i) EXCEPT SELECT * FROM original_rows)
),'original rows unchanged after two runs');
SELECT test_assert((SELECT count(*)=2 FROM tag) AND (SELECT count(*)=3 FROM mon_an_tag),'new metadata preserved');
SELECT test_assert((SELECT vung_mien='BAC' FROM mon_an WHERE ma_mon=1) AND (SELECT vung_mien IS NULL FROM mon_an WHERE ma_mon=2),'region preserved / unknown remains null');
SELECT test_assert((SELECT la_gia_vi_co_ban FROM nguyen_lieu WHERE ma_nl=2) AND (SELECT NOT la_gia_vi_co_ban FROM nguyen_lieu WHERE ma_nl=1),'curated pantry flag preserved / false default');
SELECT test_reject($q$UPDATE mon_an SET vung_mien='INVALID'$q$,'23514','region domain');
SELECT test_reject($q$UPDATE nguyen_lieu SET la_gia_vi_co_ban=NULL$q$,'23502','pantry flag nonnull');
SELECT test_reject($q$UPDATE ct_nguyen_lieu SET vai_tro_nl='OTHER'$q$,'23514','role domain');
SELECT test_reject($q$UPDATE ct_nguyen_lieu SET vai_tro_nl=NULL$q$,'23502','role nonnull');
SELECT test_reject($q$INSERT INTO tag(slug,ten_tag) VALUES ('bua-sang','Duplicate')$q$,'23505','unique slug');
SELECT test_reject($q$INSERT INTO tag(slug,ten_tag) VALUES ('bad slug','Bad')$q$,'23514','slug format');
SELECT test_reject($q$INSERT INTO tag(slug,ten_tag) VALUES ('blank', E' \t\n')$q$,'23514','nonblank label');
SELECT test_reject($q$INSERT INTO mon_an_tag VALUES (1,1)$q$,'23505','unique dish/tag');
SELECT test_reject($q$INSERT INTO mon_an_tag VALUES (999,1)$q$,'23503','dish FK');
SELECT test_reject($q$INSERT INTO mon_an_tag VALUES (1,999)$q$,'23503','tag FK');
-- Malicious permissive legacy policies must not widen the restrictive policies.
CREATE POLICY legacy_open ON mon_an_tag FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE POLICY legacy_open ON tag FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
SET LOCAL ROLE anon;
SELECT test_assert((SELECT count(*)=1 FROM mon_an),'guest sees active dishes only');
SELECT test_assert((SELECT count(*)=2 FROM tag),'guest sees tags');
SELECT test_assert((SELECT count(*)=2 FROM mon_an_tag),'guest sees links for active dishes only');
SELECT test_assert((SELECT count(*)=2 FROM nguyen_lieu),'guest sees pantry metadata');
SELECT test_assert((SELECT match_score=66.67 FROM match_recipes(ARRAY[1::bigint])),'PRIMARY match weight 2:1');
SELECT test_assert((SELECT match_score=33.33 FROM match_recipes(ARRAY[2::bigint])),'SECONDARY weight independent of pantry flag');
SELECT test_reject($q$INSERT INTO tag(slug,ten_tag) VALUES ('guest','Guest')$q$,'42501','guest cannot write');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT test_reject($q$INSERT INTO tag(slug,ten_tag) VALUES ('member','Member')$q$,'42501','member cannot curate');
SELECT test_reject($q$INSERT INTO mon_an_tag VALUES (2,2)$q$,'42501','member cannot tag dishes');
SELECT test_assert((SELECT count(*)=2 FROM mon_an_tag),'member cannot read hidden links');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
INSERT INTO tag(slug,ten_tag) VALUES ('admin','Admin');
INSERT INTO mon_an_tag VALUES (2,2);
SELECT test_assert((SELECT count(*)=4 FROM mon_an_tag),'active admin can curate hidden dishes');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SELECT test_reject($q$INSERT INTO tag(slug,ten_tag) VALUES ('locked','Locked')$q$,'42501','locked admin cannot curate');
RESET ROLE;
DELETE FROM tag WHERE ma_tag=1;
SELECT test_assert(NOT EXISTS(SELECT 1 FROM mon_an_tag WHERE ma_tag=1),'tag delete cleans links');
SELECT test_assert((SELECT count(*)=2 FROM mon_an),'tag delete retains dishes');
ROLLBACK;
