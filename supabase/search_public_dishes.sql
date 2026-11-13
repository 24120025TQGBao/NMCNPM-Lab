create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.search_public_dishes(
  p_search text default null,
  p_page integer default 1,
  p_limit integer default 20
)
returns jsonb
language sql
stable
security invoker
set search_path = extensions, public
as $function$
  with filtered as (
    select ma_mon, ten_mon, mo_ta_ngan, hinh_anh
    from public.mon_an
    where trang_thai = 'ACTIVE'
      and (
        nullif(btrim(coalesce(p_search, '')), '') is null
        or unaccent(lower(ten_mon)) like
          '%' ||
          replace(
            replace(
              replace(unaccent(lower(btrim(p_search))), E'\\', E'\\\\'),
              '%',
              E'\\%'
            ),
            '_',
            E'\\_'
          ) ||
          '%' escape E'\\'
      )
  ),
  paged as (
    select ma_mon, ten_mon, mo_ta_ngan, hinh_anh
    from filtered
    order by ten_mon, ma_mon
    offset (greatest(coalesce(p_page, 1), 1) - 1)::bigint
      * least(greatest(coalesce(p_limit, 20), 1), 50)
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select jsonb_build_object(
    'data',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ma_mon,
            'name', ten_mon,
            'description', mo_ta_ngan,
            'image_url', hinh_anh
          )
          order by ten_mon, ma_mon
        )
        from paged
      ),
      '[]'::jsonb
    ),
    'total',
    (select count(*) from filtered)
  );
$function$;

revoke all on function public.search_public_dishes(text, integer, integer) from public;
grant execute on function public.search_public_dishes(text, integer, integer) to service_role;
