-- Test fixture only, based on docs/schema-notes.md. Not a Supabase migration.
-- auth.uid() models the verified JWT subject; Supabase Auth/RLS are not reproduced.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table nguoi_dung (
  ma_nd uuid primary key,
  ten_hien_thi text not null,
  email text,
  vai_tro text not null default 'USER' check (vai_tro in ('USER', 'ADMIN')),
  trang_thai text not null default 'ACTIVE' check (trang_thai in ('ACTIVE', 'LOCKED'))
);
create table mon_an (
  ma_mon bigint primary key,
  ten_mon text not null,
  trang_thai text not null default 'ACTIVE'
);
create table cong_thuc (
  ma_ct bigint generated always as identity primary key,
  ma_mon bigint not null references mon_an,
  ma_nguoi_tao uuid not null references nguoi_dung,
  ten_ct text not null
);
create table nguyen_lieu (
  ma_nl bigint generated always as identity primary key,
  ten_nl text not null unique
);
create table ct_nguyen_lieu (
  ma_ct bigint references cong_thuc,
  ma_nl bigint references nguyen_lieu,
  so_luong numeric check (so_luong > 0),
  don_vi text,
  vai_tro_nl text not null default 'SECONDARY' check (vai_tro_nl in ('PRIMARY', 'SECONDARY')),
  primary key (ma_ct, ma_nl)
);
create table buoc_cong_thuc (
  ma_ct bigint references cong_thuc,
  stt int check (stt > 0),
  noi_dung text not null check (length(btrim(noi_dung)) > 0),
  primary key (ma_ct, stt)
);
create table bai_dang (
  ma_bai bigint generated always as identity primary key,
  ma_tac_gia uuid not null references nguoi_dung,
  loai_bai text not null check (loai_bai in ('RECIPE', 'REVIEW')),
  ma_ct bigint references cong_thuc,
  tieu_de text not null,
  noi_dung text not null,
  trang_thai text not null default 'DRAFT' check (trang_thai in ('PUBLIC', 'HIDDEN', 'DELETED', 'DRAFT')),
  tao_luc timestamptz not null default now()
);
