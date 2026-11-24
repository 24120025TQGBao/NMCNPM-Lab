// node supabase/tests/benchmark_dish_matching.mjs snapshot.json > /tmp/matching-benchmark.sql
// Run generated SQL in a disposable DB after fixture.sql + apply.sql.
// Snapshot keys: dishes, recipes, ingredients, rows, steps (see handoff).
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const key of ['dishes', 'recipes', 'ingredients', 'rows', 'steps']) {
  if (!Array.isArray(snapshot[key])) throw new Error(`Missing array ${key}`);
}
const literal = JSON.stringify(snapshot).replaceAll("'", "''");
process.stdout.write(`\\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE matching_snapshot(data jsonb);
INSERT INTO matching_snapshot VALUES ('${literal}'::jsonb);
INSERT INTO public.mon_an(ma_mon,ten_mon)
 SELECT x.* FROM matching_snapshot, jsonb_to_recordset(data->'dishes') AS x(ma_mon bigint,ten_mon text);
INSERT INTO public.nguyen_lieu(ma_nl,ten_nl,la_gia_vi_co_ban)
 SELECT x.ma_nl,x.ten_nl,coalesce(x.la_gia_vi_co_ban,false) FROM matching_snapshot,
 jsonb_to_recordset(data->'ingredients') AS x(ma_nl bigint,ten_nl text,la_gia_vi_co_ban boolean);
INSERT INTO public.cong_thuc(ma_ct,ma_mon,ten_ct,thoi_gian_phut,trang_thai_thanh_phan)
 SELECT x.* FROM matching_snapshot, jsonb_to_recordset(data->'recipes')
 AS x(ma_ct bigint,ma_mon bigint,ten_ct text,thoi_gian_phut integer,trang_thai_thanh_phan text);
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,vai_tro_nl,ghi_chu)
 SELECT x.* FROM matching_snapshot, jsonb_to_recordset(data->'rows')
 AS x(ma_ct bigint,ma_nl bigint,so_luong numeric,don_vi text,vai_tro_nl text,ghi_chu text);
INSERT INTO public.buoc_cong_thuc(ma_ct,stt,noi_dung)
 SELECT x.* FROM matching_snapshot, jsonb_to_recordset(data->'steps')
 AS x(ma_ct bigint,stt integer,noi_dung text);
SET CONSTRAINTS ALL IMMEDIATE;
ANALYZE public.mon_an; ANALYZE public.cong_thuc; ANALYZE public.ct_nguyen_lieu;
ANALYZE public.nguyen_lieu; ANALYZE public.buoc_cong_thuc;
SELECT version();
SELECT 'dataset' AS label,(SELECT count(*) FROM public.mon_an) AS dishes,
 (SELECT count(*) FROM public.cong_thuc) AS recipes,
 (SELECT count(*) FROM public.ct_nguyen_lieu) AS ingredient_rows;
SET LOCAL ROLE anon;
DO $bench$
DECLARE ids bigint[]; label text; pantry boolean; started timestamptz;
 samples double precision[]; elapsed double precision; median double precision; p95 double precision;
BEGIN
 FOREACH label IN ARRAY ARRAY['empty','five_ids','all_ids','pantry'] LOOP
   pantry:=label='pantry';
   SELECT coalesce(array_agg(ma_nl),'{}') INTO ids FROM (
     SELECT ma_nl FROM public.nguyen_lieu ORDER BY ma_nl
     LIMIT CASE WHEN label='empty' THEN 0 WHEN label='all_ids' THEN 1000 ELSE 5 END
   ) x;
   PERFORM * FROM public.match_dishes(ids,pantry,100,0);
   samples:='{}';
   FOR iteration IN 1..30 LOOP
     started:=clock_timestamp();
     PERFORM * FROM public.match_dishes(ids,pantry,100,0);
     elapsed:=extract(epoch FROM clock_timestamp()-started)*1000;
     samples:=array_append(samples,elapsed);
   END LOOP;
   SELECT percentile_cont(0.5) WITHIN GROUP(ORDER BY v),percentile_cont(0.95) WITHIN GROUP(ORDER BY v)
     INTO median,p95 FROM unnest(samples) v;
   RAISE NOTICE '%: n=30 median_ms=% p95_ms=% max_ms=%',label,round(median::numeric,2),
     round(p95::numeric,2),(SELECT round(max(v)::numeric,2) FROM unnest(samples) v);
 END LOOP;
END $bench$;
RESET ROLE;
ROLLBACK;
`);
