-- psql, EMPTY disposable DB only. Public names snapshot; recipe rows below are synthetic.
\set ON_ERROR_STOP on
\ir fixture.sql
\ir ../migrations/202611110001_integrity.sql
\ir ../migrations/202611110002_access.sql
\ir ../migrations/202611110003_moderation.sql
\ir ../migrations/202611110004_queries.sql
\ir ../migrations/202611210001_discovery_metadata.sql
\ir ingredient_inventory_fixture.sql
INSERT INTO mon_an(ma_mon,ten_mon) VALUES (1,'Kiểm thử danh mục');
INSERT INTO cong_thuc(ma_ct,ma_mon,ten_ct) VALUES (1,1,'Một công thức dùng toàn bộ danh mục');
INSERT INTO ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi) SELECT 1,ma_nl,1,'g' FROM nguyen_lieu;
CREATE TEMP TABLE original_names AS SELECT ma_nl,ten_nl FROM nguyen_lieu;
\ir ../migrations/202611210002_ingredient_dictionary.sql
\ir ../migrations/202611210002_ingredient_dictionary.sql
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM nguyen_lieu GROUP BY ten_khong_dau HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate keys'; END IF;
 IF EXISTS (SELECT 1 FROM original_names WHERE public.resolve_ingredient(ten_nl) IS NULL) THEN RAISE EXCEPTION 'Lost name'; END IF;
 IF EXISTS (SELECT 1 FROM ct_nguyen_lieu i LEFT JOIN nguyen_lieu n USING(ma_nl) WHERE n.ma_nl IS NULL) THEN RAISE EXCEPTION 'Orphan'; END IF;
 IF (SELECT sum(so_luong) FROM ct_nguyen_lieu)<>340 THEN RAISE EXCEPTION 'Lost quantity'; END IF;
 IF (SELECT count(*) FROM ct_nguyen_lieu)<>(SELECT count(*) FROM nguyen_lieu) THEN RAISE EXCEPTION 'Lost relationship'; END IF;
 IF public.resolve_ingredient('hanh hoa')<>public.resolve_ingredient('hanh la') OR public.resolve_ingredient('xi dau')<>public.resolve_ingredient('nuoc tuong') THEN RAISE EXCEPTION 'Synonym failed'; END IF;
END $$;
SELECT (SELECT count(*) FROM original_names) AS before_count,(SELECT count(*) FROM nguyen_lieu) AS after_count,
 (SELECT count(*) FROM app_private.ingredient_merge_audit) AS audited_changes;
SELECT 'ingredient inventory PASS' AS result;
