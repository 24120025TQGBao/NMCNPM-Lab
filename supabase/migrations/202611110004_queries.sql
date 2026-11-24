BEGIN;
CREATE VIEW public.thong_tin_cong_thuc WITH (security_invoker=true) AS
SELECT c.*, (c.trang_thai_thanh_phan='COMPLETE' AND c.thoi_gian_phut IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.buoc_cong_thuc b WHERE b.ma_ct=c.ma_ct)) AS du_thong_tin_huong_dan
FROM public.cong_thuc c;
GRANT SELECT ON public.thong_tin_cong_thuc TO anon,authenticated;

-- A missing/hidden dish retains its saved ID and can still be removed by its owner.
CREATE FUNCTION public.saved_dishes()
RETURNS TABLE(ma_mon bigint,ten_mon text,hinh_anh text,khong_con_kha_dung boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT f.ma_mon,m.ten_mon,m.hinh_anh,(m.ma_mon IS NULL OR m.trang_thai<>'ACTIVE')
  FROM public.mon_yeu_thich f LEFT JOIN public.mon_an m ON m.ma_mon=f.ma_mon
  WHERE f.ma_nd=auth.uid() ORDER BY f.tao_luc DESC,f.ma_mon
$$;
REVOKE ALL ON FUNCTION public.saved_dishes() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.saved_dishes() TO authenticated;
-- All queries run as the caller, so private restrictions and content visibility use RLS.
CREATE FUNCTION public.search_dishes(
  query_text text DEFAULT '', attribute_ids bigint[] DEFAULT '{}', max_minutes integer DEFAULT NULL,
  discovery boolean DEFAULT false, excluded_dish_ids bigint[] DEFAULT '{}'
) RETURNS SETOF public.mon_an LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF max_minutes IS NOT NULL AND max_minutes<=0 THEN RAISE EXCEPTION 'Time must be positive' USING ERRCODE='22023'; END IF;
  IF discovery AND (NOT app_private.active_user() OR NOT EXISTS (SELECT 1 FROM public.so_thich_nguoi_dung WHERE ma_nd=auth.uid())) THEN
    RAISE EXCEPTION 'Discovery requires an active account with saved preferences' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT m.* FROM public.mon_an m WHERE m.trang_thai='ACTIVE'
    AND coalesce(m.hinh_anh ~ '[^[:space:]]',false) AND coalesce(m.mo_ta_ngan ~ '[^[:space:]]',false)
    AND position(lower(coalesce(query_text,'')) IN lower(m.ten_mon))>0
    AND NOT (m.ma_mon=ANY(coalesce(excluded_dish_ids,'{}')))
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(attribute_ids,'{}')) a(id)
      WHERE NOT EXISTS (SELECT 1 FROM public.mon_an_thuoc_tinh t WHERE t.ma_mon=m.ma_mon AND t.ma_tt=a.id))
    AND (max_minutes IS NULL OR EXISTS (SELECT 1 FROM public.cong_thuc c WHERE c.ma_mon=m.ma_mon AND c.trang_thai='ACTIVE' AND c.thoi_gian_phut<=max_minutes))
    AND (NOT discovery OR EXISTS (SELECT 1 FROM public.mon_an_thuoc_tinh t WHERE t.ma_mon=m.ma_mon
      AND NOT EXISTS (SELECT 1 FROM public.so_thich_nguoi_dung s WHERE s.ma_nd=auth.uid() AND s.ma_tt=t.ma_tt)))
    ORDER BY (SELECT count(*) FROM public.mon_an_thuoc_tinh t JOIN public.so_thich_nguoi_dung s USING(ma_tt)
      WHERE t.ma_mon=m.ma_mon AND s.ma_nd=auth.uid()) DESC,m.ten_mon,m.ma_mon;
END $$;

-- Weight defaults are an explicit implementation choice; callers can configure them.
CREATE FUNCTION public.match_recipes(ingredient_ids bigint[],primary_weight numeric DEFAULT 2,secondary_weight numeric DEFAULT 1)
RETURNS TABLE(ma_ct bigint,ma_mon bigint,ten_ct text,match_score numeric,missing_ingredients jsonb,ingredient_information_complete boolean)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF ingredient_ids IS NULL OR cardinality(ingredient_ids)=0 OR EXISTS (
    SELECT 1 FROM unnest(ingredient_ids) x(id) WHERE id IS NULL OR NOT EXISTS (SELECT 1 FROM public.nguyen_lieu n WHERE n.ma_nl=x.id)
  ) THEN RAISE EXCEPTION 'Provide at least one valid ingredient; unknown IDs are rejected' USING ERRCODE='22023'; END IF;
  IF primary_weight IS NULL OR secondary_weight IS NULL OR primary_weight<=0 OR secondary_weight<=0 THEN
    RAISE EXCEPTION 'Weights must be positive' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT c.ma_ct,c.ma_mon,c.ten_ct,
    round(100*sum(CASE WHEN i.ma_nl=ANY(ingredient_ids) THEN CASE i.vai_tro_nl WHEN 'PRIMARY' THEN primary_weight ELSE secondary_weight END ELSE 0 END)
      /sum(CASE i.vai_tro_nl WHEN 'PRIMARY' THEN primary_weight ELSE secondary_weight END),2),
    coalesce(jsonb_agg(jsonb_build_object('ma_nl',i.ma_nl,'ten_nl',n.ten_nl,'so_luong',i.so_luong,'don_vi',i.don_vi,'ghi_chu',i.ghi_chu) ORDER BY i.ma_nl)
      FILTER (WHERE NOT i.ma_nl=ANY(ingredient_ids)),'[]'::jsonb),c.trang_thai_thanh_phan='COMPLETE'
  FROM public.cong_thuc c JOIN public.mon_an m ON m.ma_mon=c.ma_mon
    JOIN public.ct_nguyen_lieu i ON i.ma_ct=c.ma_ct JOIN public.nguyen_lieu n ON n.ma_nl=i.ma_nl
  WHERE c.trang_thai='ACTIVE' AND m.trang_thai='ACTIVE'
    AND NOT EXISTS (SELECT 1 FROM public.ct_nguyen_lieu bad JOIN public.han_che_nguyen_lieu h ON h.ma_nl=bad.ma_nl
      WHERE bad.ma_ct=c.ma_ct AND h.ma_nd=auth.uid())
  GROUP BY c.ma_ct,c.ma_mon,c.ten_ct,c.trang_thai_thanh_phan
  HAVING bool_or(i.ma_nl=ANY(ingredient_ids)) ORDER BY 4 DESC,c.ma_ct;
END $$;

-- A candidate lookup, not a hard-coded geographic uniqueness rule. Radius is supplied in metres.
CREATE FUNCTION public.nearby_restaurants(latitude double precision,longitude double precision,radius_metres double precision)
RETURNS TABLE(ma_quan bigint,ten_quan text,dia_chi text,distance_metres double precision)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF latitude IS NULL OR longitude IS NULL OR radius_metres IS NULL OR latitude NOT BETWEEN -90 AND 90
    OR longitude NOT BETWEEN -180 AND 180 OR radius_metres<=0 OR radius_metres='Infinity'::float8 THEN
    RAISE EXCEPTION 'Valid coordinates and a positive finite radius required' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT q.ma_quan,q.ten_quan,q.dia_chi,d.metres
  FROM public.quan_an q CROSS JOIN LATERAL (
    SELECT 6371000*2*asin(sqrt(least(1::float8,power(sin(radians(q.vi_do::float8-latitude)/2),2)
      +cos(radians(latitude))*cos(radians(q.vi_do::float8))*power(sin(radians(q.kinh_do::float8-longitude)/2),2)))) AS metres
  ) d WHERE q.trang_thai='ACTIVE' AND d.metres<=radius_metres ORDER BY d.metres,q.ma_quan;
END $$;
REVOKE ALL ON FUNCTION public.search_dishes(text,bigint[],integer,boolean,bigint[]),public.match_recipes(bigint[],numeric,numeric),public.nearby_restaurants(float8,float8,float8) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_dishes(text,bigint[],integer,boolean,bigint[]),public.match_recipes(bigint[],numeric,numeric),public.nearby_restaurants(float8,float8,float8) TO anon,authenticated;
COMMIT;
