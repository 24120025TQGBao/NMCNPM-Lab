-- psql only: EMPTY disposable database, never production.
\set ON_ERROR_STOP on
\ir fixture.sql
\ir ../migrations/202611110001_integrity.sql
\ir ../migrations/202611110002_access.sql
\ir ../migrations/202611110003_moderation.sql
\ir ../migrations/202611110004_queries.sql
\ir ../migrations/202611210001_discovery_metadata.sql
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
INSERT INTO nguoi_dung(ma_nd,vai_tro) VALUES ('00000000-0000-0000-0000-000000000001','USER'),('00000000-0000-0000-0000-000000000002','ADMIN');
INSERT INTO mon_an(ma_mon,ten_mon) VALUES (1,'Món thử');
INSERT INTO cong_thuc(ma_ct,ma_mon,ten_ct) VALUES (1,1,'Cùng đơn vị'),(2,1,'Khác đơn vị'),(3,1,'Sprint 1');
INSERT INTO nguyen_lieu(ma_nl,ten_nl,la_gia_vi_co_ban) VALUES
 (10,'Hành lá',false),(11,'Hành hoa',true),(12,'hanh la',false),(13,'Nước',false),(14,'Nước lọc',false),
 (15,'Thơm',false),(16,'Khóm',false),(17,'Nấm mèo khô',false),(18,'Mộc nhĩ',false);
SELECT setval('nguyen_lieu_ma_nl_seq',100);
SELECT setval('cong_thuc_ma_ct_seq',100);
INSERT INTO ct_nguyen_lieu VALUES (1,10,10,'g','SECONDARY','thái nhỏ'),(1,11,20,'g','PRIMARY','rửa sạch'),
 (2,10,1,'bó','SECONDARY',NULL),(2,12,20,'g','PRIMARY',NULL),(3,13,200,'ml','SECONDARY',NULL);
INSERT INTO han_che_nguyen_lieu VALUES
 ('00000000-0000-0000-0000-000000000001',10,'AVOID'),('00000000-0000-0000-0000-000000000001',11,'ALLERGY');
\ir ingredient_existing_registry_fixture.sql
\ir ../migrations/202611210002_ingredient_dictionary.sql
-- Add a custom synonym then rerun to prove it and merged data survive.
INSERT INTO nguyen_lieu_dong_nghia(ten_goi,ma_nl) VALUES ('Hành thử',10);
CREATE TEMP TABLE after_first_run AS SELECT to_jsonb(i) AS data FROM ct_nguyen_lieu i;
\ir ../migrations/202611210002_ingredient_dictionary.sql
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
 RAISE EXCEPTION 'FAIL: %, succeeded',label;
END $$;
SELECT test_assert((SELECT count(*)=5 FROM nguyen_lieu),'duplicates merged, dry/fresh distinct');
SELECT test_assert(resolve_ingredient('  HÀNH   XANH ')=10 AND resolve_ingredient('hanh hoa')=10 AND resolve_ingredient(U&'Ha\0300nh la\0301')=10,'case whitespace aliases and NFD');
SELECT test_assert(resolve_ingredient('nuoc')=14 AND resolve_ingredient('THOM')=15 AND resolve_ingredient('khom')=15,'canonical Vietnamese and regional names');
SELECT test_assert((SELECT ten_nl='Dứa' FROM nguyen_lieu WHERE ma_nl=15),'accented canonical rename');
SELECT test_assert((SELECT la_gia_vi_co_ban FROM nguyen_lieu WHERE ma_nl=10),'pantry flag OR');
SELECT test_assert((SELECT count(*)=1 FROM search_ingredients('hanh x')),'alias prefix search');
SELECT test_assert(NOT EXISTS(SELECT FROM search_ingredients('%')) AND NOT EXISTS(SELECT FROM search_ingredients('_')) AND NOT EXISTS(SELECT FROM search_ingredients(E'\\')),'literal wildcards');
SELECT test_assert(NOT EXISTS(SELECT FROM ct_nguyen_lieu i LEFT JOIN nguyen_lieu n USING(ma_nl) WHERE n.ma_nl IS NULL),'no recipe orphans');
SELECT test_assert((SELECT so_luong=30 AND don_vi='g' AND vai_tro_nl='PRIMARY' AND ghi_chu LIKE '%thái nhỏ%' AND ghi_chu LIKE '%rửa sạch%' FROM ct_nguyen_lieu WHERE ma_ct=1 AND ma_nl=10),'same-unit collision merged without losing notes/role');
SELECT test_assert((SELECT so_luong IS NULL AND don_vi IS NULL AND ghi_chu LIKE '%1 bó%' AND ghi_chu LIKE '%20 g%' FROM ct_nguyen_lieu WHERE ma_ct=2),'mixed units preserved without conversion');
SELECT test_assert((SELECT loai_han_che='ALLERGY' FROM han_che_nguyen_lieu WHERE ma_nl=10),'allergy wins over avoid');
SELECT test_assert((SELECT count(*)=1 FROM han_che_nguyen_lieu),'no restriction duplicates');
SELECT test_assert((SELECT count(*)=8 FROM app_private.ingredient_merge_audit),'audit retained on rerun');
SELECT test_assert(NOT EXISTS((SELECT data FROM after_first_run EXCEPT SELECT to_jsonb(i) FROM ct_nguyen_lieu i) UNION ALL (SELECT to_jsonb(i) FROM ct_nguyen_lieu i EXCEPT SELECT data FROM after_first_run)),'rerun preserves recipe rows');
SELECT test_assert(resolve_ingredient('hanh thu')=10,'custom aliases preserved');
SELECT test_reject($q$INSERT INTO nguyen_lieu(ten_nl) VALUES ('HANH HOA')$q$,'23505','alias cannot become new canonical');
SELECT test_reject($q$INSERT INTO nguyen_lieu(ten_nl) VALUES ('hanh la')$q$,'23505','accent-insensitive uniqueness');
SELECT test_reject($q$UPDATE nguyen_lieu_dong_nghia SET ma_nl=14 WHERE ten_khong_dau='hanh la'$q$,'23514','cannot steal canonical registry entry');
CREATE POLICY legacy_open ON nguyen_lieu_dong_nghia FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
SET LOCAL ROLE anon;
SELECT test_assert(resolve_ingredient('hanh xanh')=10,'anon resolves synonyms');
SELECT test_reject($q$SELECT * FROM app_private.ingredient_merge_audit$q$,'42501','audit is private');
SELECT test_reject($q$INSERT INTO nguyen_lieu_dong_nghia VALUES ('Forbidden',DEFAULT,10)$q$,'42501','anon cannot curate');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT test_reject($q$INSERT INTO nguyen_lieu_dong_nghia(ten_goi,ma_nl) VALUES ('Forbidden',10)$q$,'42501','member cannot curate despite permissive policy');
SELECT test_assert((create_post_with_recipe(1,'Sprint 1 alias',NULL,'[{"name":"hanh xanh","quantity":5,"unit":"g"}]','[{"content":"Nấu"}]')->'ingredients'->0->>'ingredient_id')::bigint=10,'Sprint 1 reuses canonical');
SELECT test_assert((create_post_with_recipe(1,'New ingredient',NULL,'[{"name":"Rau thử nghiệm"}]','[{"content":"Nấu"}]')->'ingredients'->0->>'name')='Rau thử nghiệm','unknown names still supported');
SELECT test_assert(resolve_ingredient('rau thu nghiem') IS NOT NULL,'new names registered');
SELECT test_reject($q$SELECT create_post_with_recipe(1,'Duplicate',NULL,'[{"name":"hanh xanh"},{"name":"Hành lá"}]','[{"content":"Nấu"}]')$q$,'P0001','duplicate synonym recipe rolls back');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
INSERT INTO nguyen_lieu_dong_nghia(ten_goi,ma_nl) VALUES ('Hành admin',10);
RESET ROLE;
SELECT test_assert((SELECT count(*)=2 FROM bai_dang),'failed post rolled back');
SELECT test_assert((SELECT count(*)=5 FROM cong_thuc),'failed recipe rolled back');
SELECT 'ingredient dictionary PASS' AS result;
ROLLBACK;
