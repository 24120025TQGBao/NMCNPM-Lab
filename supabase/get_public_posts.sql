-- Danh sách bài công khai, mới nhất trước, có phân trang
create or replace function public.get_public_posts(p_page int, p_limit int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (
      select count(*) from bai_dang
      where loai_bai = 'RECIPE' and trang_thai = 'PUBLIC'
    ),
    'data', coalesce((
      select jsonb_agg(p.item order by p.tao_luc desc, p.ma_bai desc)
      from (
        select b.ma_bai, b.tao_luc,
               jsonb_build_object(
                 'id', b.ma_bai,
                 'title', b.tieu_de,
                 'created_at', b.tao_luc,
                 'dish', jsonb_build_object('id', m.ma_mon, 'name', m.ten_mon),
                 'author', jsonb_build_object('id', u.ma_nd, 'display_name', u.ten_hien_thi)
               ) as item
        from bai_dang b
        join cong_thuc c on c.ma_ct = b.ma_ct
        join mon_an m on m.ma_mon = c.ma_mon
        join nguoi_dung u on u.ma_nd = b.ma_tac_gia
        where b.loai_bai = 'RECIPE' and b.trang_thai = 'PUBLIC'
        order by b.tao_luc desc, b.ma_bai desc
        limit p_limit offset (p_page - 1) * p_limit
      ) p
    ), '[]'::jsonb)
  );
$$;

-- Chi tiết một bài công khai; trả null nếu không tồn tại hoặc không công khai
create or replace function public.get_public_post(p_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
      where ci.ma_ct = b.ma_ct
    ),
    'steps', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'order', s.stt,
               'content', s.noi_dung
             ) order by s.stt), '[]'::jsonb)
      from buoc_cong_thuc s
      where s.ma_ct = b.ma_ct
    )
  )
  from bai_dang b
  join cong_thuc c on c.ma_ct = b.ma_ct
  join mon_an m on m.ma_mon = c.ma_mon
  join nguoi_dung u on u.ma_nd = b.ma_tac_gia
  where b.ma_bai = p_id
    and b.loai_bai = 'RECIPE'
    and b.trang_thai = 'PUBLIC';
$$;

-- Công khai: khách (anon) và người dùng đã đăng nhập đều gọi được
revoke all on function public.get_public_posts(int, int) from public;
revoke all on function public.get_public_post(bigint) from public;
grant execute on function public.get_public_posts(int, int) to anon, authenticated;
grant execute on function public.get_public_post(bigint) to anon, authenticated;