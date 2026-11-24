create or replace function public.create_post_with_recipe(
  p_dish_id bigint,
  p_title text,
  p_content text,
  p_ingredients jsonb,
  p_steps jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_ct bigint;
  v_post bigint;
  v_item jsonb;
  v_nl bigint;
  v_name text;
begin
  -- Người đăng luôn lấy từ token (auth.uid()), không nhận từ client
  if v_uid is null then
    raise exception 'ERR_UNAUTHORIZED';
  end if;

  select trang_thai into v_status from nguoi_dung where ma_nd = v_uid;
  if v_status is distinct from 'ACTIVE' then
    raise exception 'ERR_FORBIDDEN';
  end if;

  if not exists (select 1 from mon_an where ma_mon = p_dish_id and trang_thai = 'ACTIVE') then
    raise exception 'ERR_DISH_NOT_FOUND';
  end if;

  -- 1. Công thức
  insert into cong_thuc (ma_mon, ma_nguoi_tao, ten_ct)
  values (p_dish_id, v_uid, p_title)
  returning ma_ct into v_ct;

  -- 2. Nguyên liệu (dùng ingredient_id, hoặc tìm/tạo theo tên)
  for v_item in select e from jsonb_array_elements(p_ingredients) as e loop
    v_nl := null;

    if nullif(v_item->>'ingredient_id', '') is not null then
      select ma_nl into v_nl from nguyen_lieu
      where ma_nl = (v_item->>'ingredient_id')::bigint;
      if v_nl is null then
        raise exception 'ERR_INGREDIENT_NOT_FOUND';
      end if;
    else
      v_name := btrim(v_item->>'name');
      select ma_nl into v_nl from nguyen_lieu
      where lower(ten_nl) = lower(v_name) limit 1;
      if v_nl is null then
        insert into nguyen_lieu (ten_nl) values (v_name)
        on conflict (ten_nl) do nothing
        returning ma_nl into v_nl;
        if v_nl is null then
          select ma_nl into v_nl from nguyen_lieu where ten_nl = v_name;
        end if;
      end if;
    end if;

    begin
      insert into ct_nguyen_lieu (ma_ct, ma_nl, so_luong, don_vi, vai_tro_nl)
      values (
        v_ct,
        v_nl,
        nullif(v_item->>'quantity', '')::numeric,
        nullif(btrim(v_item->>'unit'), ''),
        coalesce(nullif(v_item->>'role', ''), 'SECONDARY')
      );
    exception when unique_violation then
      raise exception 'ERR_INGREDIENT_DUPLICATE';
    end;
  end loop;

  -- 3. Các bước (stt theo thứ tự mảng)
  insert into buoc_cong_thuc (ma_ct, stt, noi_dung)
  select v_ct, s.ord::int, btrim(s.val->>'content')
  from jsonb_array_elements(p_steps) with ordinality as s(val, ord);

  -- 4. Bài đăng
  insert into bai_dang (ma_tac_gia, loai_bai, ma_ct, tieu_de, noi_dung, trang_thai)
  values (
    v_uid, 'RECIPE', v_ct, p_title,
    coalesce(nullif(btrim(p_content), ''), p_title),
    'PUBLIC'
  )
  returning ma_bai into v_post;

  -- 5. Trả về dữ liệu bài vừa tạo theo đúng cấu trúc contract
  return (
    select jsonb_build_object(
      'id', b.ma_bai,
      'title', b.tieu_de,
      'content', b.noi_dung,
      'created_at', b.tao_luc,
      'dish', jsonb_build_object('id', m.ma_mon, 'name', m.ten_mon),
      'author', jsonb_build_object('id', u.ma_nd, 'display_name', u.ten_hien_thi),
      'ingredients', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'ingredient_id', n.ma_nl,
                 'name', n.ten_nl,
                 'quantity', ci.so_luong,
                 'unit', ci.don_vi,
                 'role', ci.vai_tro_nl
               ) order by ci.vai_tro_nl, n.ten_nl), '[]'::jsonb)
        from ct_nguyen_lieu ci
        join nguyen_lieu n on n.ma_nl = ci.ma_nl
        where ci.ma_ct = v_ct
      ),
      'steps', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'order', s.stt,
                 'content', s.noi_dung
               ) order by s.stt), '[]'::jsonb)
        from buoc_cong_thuc s
        where s.ma_ct = v_ct
      )
    )
    from bai_dang b
    join mon_an m on m.ma_mon = p_dish_id
    join nguoi_dung u on u.ma_nd = b.ma_tac_gia
    where b.ma_bai = v_post
  );
end;
$$;

-- Chỉ người dùng đã đăng nhập mới được gọi
revoke all on function public.create_post_with_recipe(bigint, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.create_post_with_recipe(bigint, text, text, jsonb, jsonb) to authenticated;