-- DB10/DB11 + discovery metadata first. Atomic, rerunnable; legacy match_recipes stays available.
BEGIN;
CREATE INDEX IF NOT EXISTS matching_active_recipe
 ON public.cong_thuc(ma_mon,ma_ct) WHERE trang_thai='ACTIVE';
-- Existing PK ct_nguyen_lieu(ma_ct,ma_nl), reverse ingredient index and
-- buoc_cong_thuc(ma_ct,stt) already support recipe aggregation and instruction checks.
CREATE INDEX IF NOT EXISTS matching_pantry
 ON public.nguyen_lieu(ma_nl) WHERE la_gia_vi_co_ban;

CREATE OR REPLACE FUNCTION public.match_dishes(
 p_ingredient_ids bigint[], p_include_pantry boolean DEFAULT false,
 p_limit integer DEFAULT 100, p_offset integer DEFAULT 0
)
RETURNS TABLE(
 ma_mon bigint, ten_mon text, ma_ct bigint, ten_ct text,
 match_percent numeric, matched_weight bigint, total_weight bigint,
 missing_count integer, missing_ingredients jsonb,
 readiness text, is_incomplete boolean
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_ingredient_ids IS NULL OR cardinality(p_ingredient_ids)>1000 OR EXISTS (
   SELECT 1 FROM unnest(p_ingredient_ids) x(id)
   WHERE id IS NULL OR NOT EXISTS (SELECT 1 FROM public.nguyen_lieu n WHERE n.ma_nl=x.id)
 ) THEN
   RAISE EXCEPTION 'Use 0..1000 canonical ingredient IDs; null/unknown IDs are invalid' USING ERRCODE='22023';
 END IF;
 IF p_include_pantry IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500
   OR p_offset IS NULL OR p_offset<0 THEN
   RAISE EXCEPTION 'Pantry must be boolean; limit 1..500; offset >= 0' USING ERRCODE='22023';
 END IF;
 RETURN QUERY
 WITH available AS MATERIALIZED (
   SELECT unnest(p_ingredient_ids) AS id
   UNION SELECT n.ma_nl FROM public.nguyen_lieu n WHERE p_include_pantry AND n.la_gia_vi_co_ban
 ), candidates AS (
   SELECT m.ma_mon,m.ten_mon,c.ma_ct,c.ten_ct,c.thoi_gian_phut,c.trang_thai_thanh_phan
   FROM public.mon_an m
   LEFT JOIN public.cong_thuc c ON c.ma_mon=m.ma_mon AND c.trang_thai='ACTIVE'
   WHERE m.trang_thai='ACTIVE'
     AND NOT EXISTS (
       SELECT 1 FROM public.ct_nguyen_lieu bad
       JOIN public.han_che_nguyen_lieu h ON h.ma_nl=bad.ma_nl AND h.ma_nd=auth.uid()
       WHERE bad.ma_ct=c.ma_ct
     )
 ), scored AS (
   SELECT c.ma_mon,c.ten_mon,c.ma_ct,c.ten_ct,
     coalesce(sum(CASE WHEN a.id IS NOT NULL THEN CASE i.vai_tro_nl WHEN 'PRIMARY' THEN 2 ELSE 1 END ELSE 0 END),0)::bigint AS matched,
     coalesce(sum(CASE WHEN i.ma_nl IS NOT NULL THEN CASE i.vai_tro_nl WHEN 'PRIMARY' THEN 2 ELSE 1 END ELSE 0 END),0)::bigint AS total,
     count(*) FILTER (WHERE i.ma_nl IS NOT NULL AND a.id IS NULL)::integer AS missing,
     coalesce(jsonb_agg(jsonb_build_object('ma_nl',i.ma_nl,'ten_nl',n.ten_nl,
       'role',i.vai_tro_nl,'so_luong',i.so_luong,'don_vi',i.don_vi,'ghi_chu',i.ghi_chu) ORDER BY i.ma_nl)
       FILTER (WHERE i.ma_nl IS NOT NULL AND a.id IS NULL),'[]'::jsonb) AS missing_list,
     (c.ma_ct IS NULL OR c.trang_thai_thanh_phan IS DISTINCT FROM 'COMPLETE'
       OR count(i.ma_nl)=0 OR c.thoi_gian_phut IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.buoc_cong_thuc b WHERE b.ma_ct=c.ma_ct)
       OR coalesce(bool_or(i.ma_nl IS NOT NULL AND NOT (
         (i.so_luong IS NOT NULL AND i.so_luong>0 AND coalesce(i.don_vi ~ '[^[:space:]]',false))
         OR (i.so_luong IS NULL AND coalesce(i.ghi_chu ~ '[^[:space:]]',false))
       )),false)) AS incomplete
   FROM candidates c LEFT JOIN public.ct_nguyen_lieu i ON i.ma_ct=c.ma_ct
   LEFT JOIN public.nguyen_lieu n ON n.ma_nl=i.ma_nl
   LEFT JOIN available a ON a.id=i.ma_nl
   GROUP BY c.ma_mon,c.ten_mon,c.ma_ct,c.ten_ct,c.thoi_gian_phut,c.trang_thai_thanh_phan
 ), ranked AS (
   SELECT s.*,100::numeric*s.matched/nullif(s.total,0) AS percent,
     row_number() OVER (PARTITION BY s.ma_mon ORDER BY s.incomplete,
       100::numeric*s.matched/nullif(s.total,0) DESC NULLS LAST,s.missing,s.ma_ct) AS choice
   FROM scored s
 )
 SELECT r.ma_mon,r.ten_mon,r.ma_ct,r.ten_ct,round(r.percent,2),r.matched,r.total,
   r.missing,r.missing_list,
   CASE WHEN r.incomplete THEN 'INCOMPLETE' WHEN r.missing=0 THEN 'COOK_NOW'
     WHEN r.missing<=2 THEN 'MISSING_1_2' ELSE 'NEED_SHOPPING' END,
   r.incomplete
 FROM ranked r WHERE r.choice=1
 ORDER BY r.incomplete,r.percent DESC NULLS LAST,r.missing,r.ma_mon
 LIMIT p_limit OFFSET p_offset;
END $$;
REVOKE ALL ON FUNCTION public.match_dishes(bigint[],boolean,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_dishes(bigint[],boolean,integer,integer) TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.match_dishes(bigint[],boolean,integer,integer) IS
 'One best ACTIVE recipe per ACTIVE dish; PRIMARY:SECONDARY=2:1; pantry opt-in; RLS and caller restrictions apply. INCOMPLETE never asserts readiness.';
NOTIFY pgrst, 'reload schema';
COMMIT;
