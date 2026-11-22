
BEGIN;

-- Helper centralized for all three BE09 read RPCs. A system recipe with no
-- post is public; a recipe attached to any non-public post is not public.
CREATE OR REPLACE FUNCTION public.catalog_recipe_is_public(p_recipe_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cong_thuc c JOIN public.mon_an m ON m.ma_mon=c.ma_mon
    WHERE c.ma_ct=p_recipe_id AND c.trang_thai='ACTIVE' AND m.trang_thai='ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM public.bai_dang b WHERE b.ma_ct=c.ma_ct
          AND (b.trang_thai<>'PUBLIC' OR b.loai_bai<>'RECIPE')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.search_catalog_dishes(
  p_search text DEFAULT NULL, p_tag_codes text[] DEFAULT '{}',
  p_category text DEFAULT NULL, p_flavor text DEFAULT NULL,
  p_max_cook_time integer DEFAULT NULL, p_ingredient_ids bigint[] DEFAULT '{}',
  p_page integer DEFAULT 1, p_limit integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_page IS NULL OR p_page<1 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR
     (p_max_cook_time IS NOT NULL AND p_max_cook_time NOT BETWEEN 1 AND 1440) OR
     p_tag_codes IS NULL OR p_ingredient_ids IS NULL THEN
    RAISE EXCEPTION 'Invalid search parameters' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_ingredient_ids) x(id)
             WHERE x.id IS NULL OR x.id<1 OR NOT EXISTS (
               SELECT 1 FROM public.nguyen_lieu n WHERE n.ma_nl=x.id)) THEN
    RAISE EXCEPTION 'Unknown ingredient' USING ERRCODE='22023';
  END IF;
  RETURN (
    WITH filtered AS (
      SELECT m.ma_mon,m.ten_mon,m.mo_ta_ngan,m.hinh_anh
      FROM public.mon_an m
      WHERE m.trang_thai='ACTIVE'
        AND (nullif(btrim(coalesce(p_search,'')),'') IS NULL OR
             extensions.unaccent(lower(m.ten_mon)) LIKE
                ('%' || replace(replace(replace(extensions.unaccent(lower(btrim(p_search))),
                  E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%') ESCAPE E'\\')
        -- Optional meal/category codes use the existing taxonomy; no new columns.
        AND (p_category IS NULL OR EXISTS (
          SELECT 1 FROM public.mon_an_thuoc_tinh mt
          JOIN public.thuoc_tinh_mon tt ON tt.ma_tt=mt.ma_tt
          WHERE mt.ma_mon=m.ma_mon
            AND upper(extensions.unaccent(replace(tt.nhom_tt,' ','_')))
               IN ('LOAI_MON','LOAI','CATEGORY','TYPE')
            AND upper(extensions.unaccent(replace(tt.gia_tri,' ','_')))=p_category
        ))
        AND (p_flavor IS NULL OR EXISTS (
          SELECT 1 FROM public.mon_an_thuoc_tinh mt
          JOIN public.thuoc_tinh_mon tt ON tt.ma_tt=mt.ma_tt
          WHERE mt.ma_mon=m.ma_mon
            AND upper(extensions.unaccent(replace(tt.nhom_tt,' ','_')))
               IN ('KHAU_VI','KHAUVI','FLAVOR')
            AND upper(extensions.unaccent(replace(tt.gia_tri,' ','_')))=p_flavor
        ))
        -- Tag AND semantics; input codes TROI_MUA map to slug 'troi-mua'.
        AND NOT EXISTS (
          SELECT 1 FROM unnest(p_tag_codes) requested(code)
          WHERE NOT EXISTS (
            SELECT 1 FROM public.mon_an_tag mat
            JOIN public.tag t ON t.ma_tag=mat.ma_tag
            WHERE mat.ma_mon=m.ma_mon
              AND upper(replace(t.slug,'-','_'))=requested.code
          )
        )
        -- PO rule: dish time is MIN among public ACTIVE recipes.
        AND (p_max_cook_time IS NULL OR (
          SELECT min(c.thoi_gian_phut) FROM public.cong_thuc c
          WHERE c.ma_mon=m.ma_mon AND public.catalog_recipe_is_public(c.ma_ct)
        )<=p_max_cook_time)
        -- Optional v1 ingredients filter: a SINGLE public recipe has ALL IDs.
        AND (cardinality(p_ingredient_ids)=0 OR EXISTS (
          SELECT 1 FROM public.cong_thuc c
          WHERE c.ma_mon=m.ma_mon AND public.catalog_recipe_is_public(c.ma_ct)
            AND NOT EXISTS (
              SELECT 1 FROM unnest(p_ingredient_ids) requested(id)
              WHERE NOT EXISTS (SELECT 1 FROM public.ct_nguyen_lieu ci
                                WHERE ci.ma_ct=c.ma_ct AND ci.ma_nl=requested.id)
            )
        ))
    ), paged AS (
      SELECT * FROM filtered ORDER BY ten_mon,ma_mon
      LIMIT p_limit OFFSET (p_page::bigint-1)*p_limit
    )
    SELECT jsonb_build_object(
      'data',coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id',ma_mon,'name',ten_mon,'description',mo_ta_ngan,'image_url',hinh_anh)
        ORDER BY ten_mon,ma_mon) FROM paged),'[]'::jsonb),
      'total',(SELECT count(*) FROM filtered)
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.get_catalog_dish(p_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH public_recipes AS (
    SELECT c.* FROM public.cong_thuc c
    WHERE c.ma_mon=p_id AND public.catalog_recipe_is_public(c.ma_ct)
  ), ingredient_counts AS (
    SELECT ci.ma_ct,count(*)::integer AS n
    FROM public.ct_nguyen_lieu ci JOIN public_recipes c USING(ma_ct)
    GROUP BY ci.ma_ct
  )
  SELECT jsonb_build_object(
    'id',m.ma_mon,'name',m.ten_mon,'description',m.mo_ta_ngan,
    'image_url',m.hinh_anh,'cook_time_minutes',(
      SELECT min(c.thoi_gian_phut) FROM public_recipes c),
    'flavor',null::text,'region',m.vung_mien,
    'tags',coalesce((
      SELECT jsonb_agg(t.slug ORDER BY t.slug)
      FROM public.mon_an_tag mt JOIN public.tag t ON t.ma_tag=mt.ma_tag
      WHERE mt.ma_mon=m.ma_mon),'[]'::jsonb),
    'recipes',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',c.ma_ct,'dish_id',c.ma_mon,'name',c.ten_ct,
        'servings',null::integer,'prep_time_minutes',c.thoi_gian_phut,
        'ingredient_count',coalesce(ic.n,0),
        'incomplete',c.trang_thai_thanh_phan IS DISTINCT FROM 'COMPLETE'
          OR c.thoi_gian_phut IS NULL
          OR coalesce(ic.n,0)=0
          OR NOT EXISTS (SELECT 1 FROM public.buoc_cong_thuc s WHERE s.ma_ct=c.ma_ct)
      ) ORDER BY c.ma_ct)
      FROM public_recipes c LEFT JOIN ingredient_counts ic ON ic.ma_ct=c.ma_ct
    ),'[]'::jsonb)
  ) FROM public.mon_an m WHERE m.ma_mon=p_id AND m.trang_thai='ACTIVE';
$$;

CREATE OR REPLACE FUNCTION public.get_catalog_recipe(p_id bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'id',c.ma_ct,'dish_id',c.ma_mon,'name',c.ten_ct,
    'servings',null::integer,'prep_time_minutes',c.thoi_gian_phut,
    'incomplete',c.trang_thai_thanh_phan IS DISTINCT FROM 'COMPLETE'
      OR c.thoi_gian_phut IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.buoc_cong_thuc s WHERE s.ma_ct=c.ma_ct)
      OR NOT EXISTS (SELECT 1 FROM public.ct_nguyen_lieu i WHERE i.ma_ct=c.ma_ct)
      OR EXISTS (SELECT 1 FROM public.ct_nguyen_lieu i WHERE i.ma_ct=c.ma_ct
           AND ((i.so_luong IS NULL AND nullif(btrim(i.ghi_chu),'') IS NULL)
             OR (i.so_luong IS NOT NULL AND
               (i.so_luong<=0 OR nullif(btrim(i.don_vi),'') IS NULL)))),
    'ingredients',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'ingredient_id',n.ma_nl,'name',n.ten_nl,
        'quantity',i.so_luong,'unit',i.don_vi,'role',i.vai_tro_nl
      ) ORDER BY n.ten_nl,n.ma_nl)
      FROM public.ct_nguyen_lieu i JOIN public.nguyen_lieu n ON n.ma_nl=i.ma_nl
      WHERE i.ma_ct=c.ma_ct),'[]'::jsonb),
    'steps',coalesce((
      SELECT jsonb_agg(jsonb_build_object('order',s.stt,'content',s.noi_dung)
             ORDER BY s.stt)
      FROM public.buoc_cong_thuc s WHERE s.ma_ct=c.ma_ct),'[]'::jsonb)
  )
  FROM public.cong_thuc c
  WHERE c.ma_ct=p_id AND public.catalog_recipe_is_public(c.ma_ct);
$$;

REVOKE ALL ON FUNCTION public.catalog_recipe_is_public(bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.search_catalog_dishes(text,text[],text,text,integer,bigint[],integer,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_catalog_dish(bigint),public.get_catalog_recipe(bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.catalog_recipe_is_public(bigint),
  public.search_catalog_dishes(text,text[],text,text,integer,bigint[],integer,integer),
  public.get_catalog_dish(bigint),public.get_catalog_recipe(bigint) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
