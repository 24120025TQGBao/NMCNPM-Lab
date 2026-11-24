-- Run only on a disposable database after fixture.sql and all migrations.
-- Every assertion raises on failure; all test data/functions roll back.
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
  RAISE EXCEPTION 'FAIL: %, statement unexpectedly succeeded',label;
END $$;

INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004');
INSERT INTO public.nguoi_dung(ma_nd,ten_hien_thi,vai_tro,trang_thai) VALUES
 ('00000000-0000-0000-0000-000000000001','Alice','USER','ACTIVE'),
 ('00000000-0000-0000-0000-000000000002','Bob','USER','ACTIVE'),
 ('00000000-0000-0000-0000-000000000003','Admin','ADMIN','ACTIVE'),
 ('00000000-0000-0000-0000-000000000004','Locked','USER','LOCKED');
INSERT INTO public.mon_an(ma_mon,ten_mon,mo_ta_ngan,hinh_anh) VALUES (1,'Dish one','Description','one.jpg'),(2,'Dish two','Description','two.jpg'),(3,'Incomplete dish',NULL,NULL);
INSERT INTO public.thuoc_tinh_mon(ma_tt,nhom_tt,gia_tri) VALUES (1,'TYPE','Soup'),(2,'TASTE','Spicy');
INSERT INTO public.mon_an_thuoc_tinh VALUES (1,1),(2,1),(2,2);
INSERT INTO public.nguyen_lieu(ma_nl,ten_nl) VALUES (1,'Rice'),(2,'Peanut'),(3,'Salt');
INSERT INTO public.cong_thuc(ma_ct,ma_mon,ma_nguoi_tao,ten_ct,thoi_gian_phut) VALUES
 (1,1,'00000000-0000-0000-0000-000000000001','Rice recipe',10),
 (2,2,'00000000-0000-0000-0000-000000000001','Allergen recipe',20),
 (3,2,'00000000-0000-0000-0000-000000000001','Unfinished recipe',NULL);
INSERT INTO public.ct_nguyen_lieu(ma_ct,ma_nl,so_luong,don_vi,vai_tro_nl) VALUES
 (1,1,100,'g','PRIMARY'),(1,3,1,'g','SECONDARY'),(2,1,100,'g','PRIMARY'),(2,2,10,'g','SECONDARY');
INSERT INTO public.buoc_cong_thuc VALUES (1,1,'Cook rice');
UPDATE public.cong_thuc SET trang_thai_thanh_phan='COMPLETE' WHERE ma_ct IN (1,2,3);
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;
SELECT public.test_assert((SELECT trang_thai_thanh_phan='COMPLETE' FROM public.cong_thuc WHERE ma_ct=1),'complete ingredients retained');
SELECT public.test_assert((SELECT trang_thai_thanh_phan='INCOMPLETE' FROM public.cong_thuc WHERE ma_ct=3),'unsupported COMPLETE claim downgraded');
INSERT INTO public.quan_an(ma_quan,ma_chu_so_huu,ten_quan,dia_chi,vi_do,kinh_do) VALUES
 (1,'00000000-0000-0000-0000-000000000001','Cafe','Street',10,106),
 (2,'00000000-0000-0000-0000-000000000002','Other cafe','Other street',11,106);
INSERT INTO public.thuc_don(ma_quan,ma_mon,gia_ban) VALUES (1,1,20000),(2,1,30000);
INSERT INTO public.bai_dang(ma_bai,ma_tac_gia,loai_bai,ma_ct,tieu_de,noi_dung,trang_thai) VALUES
 (1,'00000000-0000-0000-0000-000000000001','RECIPE',1,'Recipe','Content','PUBLIC'),
 (2,'00000000-0000-0000-0000-000000000002','RECIPE',1,'Private','Private content','DRAFT'),
 (3,'00000000-0000-0000-0000-000000000002','RECIPE',1,'Hidden','Hidden content','HIDDEN');
INSERT INTO public.binh_luan(ma_bl,ma_bai,ma_tac_gia,noi_dung) VALUES (1,1,'00000000-0000-0000-0000-000000000002','Comment');
INSERT INTO public.tep_dinh_kem(ma_bai,duong_dan_storage,loai_tep) VALUES (1,'one.jpg','IMAGE'),(2,'private.jpg','IMAGE');
INSERT INTO public.han_che_nguyen_lieu VALUES ('00000000-0000-0000-0000-000000000001',2,'ALLERGY');
INSERT INTO public.so_thich_nguoi_dung VALUES ('00000000-0000-0000-0000-000000000001',1);
-- Explicit fixture IDs must not make expected uniqueness failures hit an unrelated identity PK.
DO $$ DECLARE s record; BEGIN
  FOR s IN SELECT schemaname,sequencename FROM pg_sequences WHERE schemaname='public' LOOP
    PERFORM setval(format('%I.%I',s.schemaname,s.sequencename)::regclass,100,true);
  END LOOP;
END $$;

SELECT public.test_reject($q$INSERT INTO public.tep_dinh_kem(duong_dan_storage,loai_tep) VALUES ('x.jpg','IMAGE')$q$,'23514','attachment needs one target');
SELECT public.test_reject($q$INSERT INTO public.tep_dinh_kem(ma_bai,ma_bl,duong_dan_storage,loai_tep) VALUES (1,1,'x.jpg','IMAGE')$q$,'23514','attachment cannot have both targets');
SELECT public.test_reject($q$INSERT INTO public.bai_dang(ma_tac_gia,loai_bai,ma_quan,tieu_de,noi_dung,trang_thai) VALUES ('00000000-0000-0000-0000-000000000001','RECIPE',1,'Bad','Bad','PUBLIC')$q$,'23514','post type must match links');
SELECT public.test_reject($q$INSERT INTO public.nguyen_lieu(ten_nl) VALUES (' rice ')$q$,'23505','normalized ingredient uniqueness');
SELECT public.test_reject($q$UPDATE public.bai_dang SET noi_dung=E' \t\n' WHERE ma_bai=1$q$,'23514','whitespace-only text rejected');
SELECT public.test_reject($q$UPDATE public.thuc_don SET gia_ban=-1 WHERE ma_quan=1$q$,'23514','negative price rejected');
SELECT public.test_reject($q$UPDATE public.nguoi_dung SET vai_tro='OWNER' WHERE ma_nd='00000000-0000-0000-0000-000000000001'$q$,'23514','owner is a relationship, not a role');
SELECT public.test_reject($q$DELETE FROM public.bai_dang WHERE ma_bai=1$q$,'23514','physical post deletion forbidden');

-- Simulate an older SECURITY DEFINER RPC: the write trigger must still reject impersonation.
CREATE FUNCTION public.test_definer_reaction(other_user uuid) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.cam_xuc(ma_nd,ma_bai,loai_cam_xuc) VALUES (other_user,1,'LIKE')
$$;
-- A legacy permissive policy must not defeat the new restrictive boundary.
CREATE POLICY legacy_allow_all ON public.nguoi_dung FOR ALL TO anon,authenticated USING (true) WITH CHECK (true);

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',true);
SELECT public.test_assert((SELECT count(*)=1 FROM public.bai_dang),'guest sees only public posts');
SELECT public.test_assert((SELECT count(*)=0 FROM public.nguoi_dung),'profiles are private');
SELECT public.test_assert((SELECT count(*)=0 FROM public.han_che_nguyen_lieu),'allergies are private');
SELECT public.test_assert((SELECT count(*)=1 FROM public.tep_dinh_kem),'private attachments are hidden');
SELECT public.test_assert((SELECT count(*)=2 FROM public.search_dishes()),'suggestions require name, image and description');
SELECT public.test_assert((SELECT count(*)=1 FROM public.search_dishes(attribute_ids=>ARRAY[1,2]::bigint[])),'all attribute filters apply');
SELECT public.test_assert((SELECT count(*)=0 FROM public.search_dishes(attribute_ids=>ARRAY[999]::bigint[])),'no relaxing unsatisfied filters');
SELECT public.test_assert((SELECT count(*)=1 FROM public.search_dishes(max_minutes=>10)),'time filter applies');
SELECT public.test_assert((SELECT count(*)=1 FROM public.search_dishes(excluded_dish_ids=>ARRAY[1]::bigint[])),'exclude previously suggested IDs');
SELECT public.test_reject('SELECT * FROM public.match_recipes(ARRAY[]::bigint[])','22023','empty ingredient input');
SELECT public.test_reject('SELECT * FROM public.match_recipes(ARRAY[999]::bigint[])','22023','unknown ingredient input');
SELECT public.test_assert((SELECT count(*)=2 FROM public.match_recipes(ARRAY[1]::bigint[])),'guest matching uses available ingredients');
SELECT public.test_assert((SELECT count(*)=1 FROM public.nearby_restaurants(10,106,100)),'nearby duplicate candidates');
SELECT public.test_assert((SELECT du_thong_tin_huong_dan FROM public.thong_tin_cong_thuc WHERE ma_ct=1),'instruction completeness is exposed');
SELECT public.test_assert((SELECT NOT du_thong_tin_huong_dan FROM public.thong_tin_cong_thuc WHERE ma_ct=2),'missing steps are reported incomplete');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT public.test_assert((SELECT count(*)=1 FROM public.nguoi_dung),'user sees only own profile');
SELECT public.test_reject($q$UPDATE public.nguoi_dung SET vai_tro='ADMIN' WHERE ma_nd=auth.uid()$q$,'42501','self role escalation blocked');
SELECT public.test_assert((SELECT count(*)=1 FROM public.match_recipes(ARRAY[1]::bigint[])),'allergy exclusion takes priority over score');
SELECT public.test_assert((SELECT match_score=66.67 AND jsonb_array_length(missing_ingredients)=1 FROM public.match_recipes(ARRAY[1,1]::bigint[])),'weighted score, missing ingredients and duplicate input handling');
SELECT public.test_assert((SELECT count(*)=1 FROM public.search_dishes(discovery=>true)),'discovery requires attribute outside preferences');
SELECT public.test_reject($q$SELECT public.test_definer_reaction('00000000-0000-0000-0000-000000000002')$q$,'42501','definer RPC cannot impersonate');
INSERT INTO public.cam_xuc(ma_nd,ma_bai,loai_cam_xuc) VALUES (auth.uid(),1,'LIKE');
UPDATE public.bai_dang SET noi_dung='Edited content' WHERE ma_bai=1;
SELECT public.test_assert((SELECT sua_luc IS NOT NULL FROM public.bai_dang WHERE ma_bai=1),'edit timestamp assigned');
SELECT public.test_assert((SELECT count(*)=1 FROM public.cam_xuc WHERE ma_bai=1),'editing preserves reactions');
SELECT public.test_reject($q$INSERT INTO public.cam_xuc(ma_nd,ma_bai,loai_cam_xuc) VALUES (auth.uid(),3,'LIKE')$q$,'23514','no reaction on hidden post');
SELECT public.test_reject($q$INSERT INTO public.binh_luan(ma_bai,ma_tac_gia,noi_dung) VALUES (3,auth.uid(),'Bad')$q$,'23514','no comment on hidden post');
SELECT public.test_reject($q$UPDATE public.cong_thuc SET ma_ct=101 WHERE ma_ct=1$q$,'42501','recipe identity immutable');
SELECT public.test_reject($q$INSERT INTO public.quan_an(ma_chu_so_huu,ten_quan,dia_chi,vi_do,kinh_do) VALUES ('00000000-0000-0000-0000-000000000002','Fake','Street',10,105)$q$,'42501','restaurant creator cannot be forged');
UPDATE public.thuc_don SET gia_ban=25000 WHERE ma_quan=1;
SELECT public.test_assert((SELECT gia_ban=25000 FROM public.thuc_don WHERE ma_quan=1),'owner can edit menu');
UPDATE public.thuc_don SET gia_ban=1 WHERE ma_quan=2;
SELECT public.test_assert((SELECT gia_ban=30000 FROM public.thuc_don WHERE ma_quan=2),'cannot edit someone elses menu');
INSERT INTO public.mon_yeu_thich(ma_nd,ma_mon) VALUES (auth.uid(),1);
SELECT public.test_reject($q$INSERT INTO public.mon_yeu_thich(ma_nd,ma_mon) VALUES (auth.uid(),1)$q$,'23505','favorite is unique');
INSERT INTO public.bao_cao(ma_bao_cao,ma_nguoi_bao_cao,ma_bai,ly_do) VALUES (1,auth.uid(),1,'Violation');
SELECT public.test_reject($q$INSERT INTO public.bao_cao(ma_nguoi_bao_cao,ma_bai,ly_do) VALUES (auth.uid(),1,'Again')$q$,'23505','one report per user per post');
SELECT public.test_reject($q$INSERT INTO public.bao_cao(ma_nguoi_bao_cao,ma_bai,ma_bl,ly_do) VALUES (auth.uid(),1,1,'Bad')$q$,'23514','report has exactly one target');
SELECT public.test_reject($q$SELECT public.resolve_report(1,'RESOLVED','Reason')$q$,'42501','non-admin cannot moderate');

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
SELECT public.resolve_report(1,'RESOLVED','Community rule violation');
SELECT public.test_assert((SELECT trang_thai='HIDDEN' FROM public.bai_dang WHERE ma_bai=1),'resolved report hides content');
SELECT public.test_assert((SELECT ma_nguoi_xu_ly=auth.uid() AND thoi_diem_xu_ly IS NOT NULL AND ly_do_xu_ly='Community rule violation' FROM public.bao_cao WHERE ma_bao_cao=1),'resolution actor/time/reason retained');
SELECT public.test_assert((SELECT count(*)=2 FROM public.nhat_ky_kiem_duyet),'content and report actions audited');
SELECT public.test_reject($q$SELECT public.resolve_report(1,'DISMISSED','Again')$q$,'P0002','closed report cannot be rewritten');
SELECT public.test_reject($q$UPDATE public.bai_dang SET trang_thai='HIDDEN' WHERE ma_bai=2$q$,'23514','moderation reason is mandatory');
SELECT public.test_reject($q$UPDATE public.bai_dang SET noi_dung='Admin rewrite' WHERE ma_bai=1$q$,'42501','moderator cannot rewrite another authors post');
SELECT public.test_reject($q$UPDATE public.nhat_ky_kiem_duyet SET ly_do='Changed'$q$,'42501','audit trail append-only');
SELECT public.set_account_state('00000000-0000-0000-0000-000000000002','LOCKED','Abuse');
SELECT public.set_account_state('00000000-0000-0000-0000-000000000002','ACTIVE','Appeal accepted');
UPDATE public.mon_an SET trang_thai='DELETED' WHERE ma_mon=1;

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
SELECT public.test_reject($q$INSERT INTO public.mon_yeu_thich(ma_nd,ma_mon) VALUES (auth.uid(),1)$q$,'42501','locked account cannot save');
SELECT public.test_reject($q$INSERT INTO public.bai_dang(ma_tac_gia,loai_bai,ma_ct,tieu_de,noi_dung) VALUES (auth.uid(),'RECIPE',1,'Bad','Bad')$q$,'42501','locked account cannot post');

SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT public.test_assert((SELECT khong_con_kha_dung AND ten_mon IS NULL FROM public.saved_dishes() WHERE ma_mon=1),'deleted favorites retain an unavailable placeholder');
SELECT public.test_reject($q$INSERT INTO public.mon_yeu_thich(ma_nd,ma_mon) VALUES (auth.uid(),1)$q$,'42501','cannot newly save a deleted dish');
DELETE FROM public.ct_nguyen_lieu WHERE ma_ct=1;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT public.test_assert((SELECT trang_thai_thanh_phan='INCOMPLETE' FROM public.cong_thuc WHERE ma_ct=1),'removing ingredients invalidates completeness');
DELETE FROM public.mon_yeu_thich WHERE ma_nd=auth.uid();
SELECT public.test_assert((SELECT count(*)=0 FROM public.mon_yeu_thich),'can remove favorite after content hidden');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','service_role',true);
SELECT public.test_reject($q$INSERT INTO public.cam_xuc(ma_nd,ma_bai,loai_cam_xuc) VALUES ('00000000-0000-0000-0000-000000000002',1,'LIKE')$q$,'23514','trusted writes also enforce public interactions');
SELECT public.test_reject($q$INSERT INTO public.bao_cao(ma_nguoi_bao_cao,ma_bl,ly_do,trang_thai,ma_nguoi_xu_ly,thoi_diem_xu_ly,ly_do_xu_ly) VALUES ('00000000-0000-0000-0000-000000000001',1,'Bad','RESOLVED','00000000-0000-0000-0000-000000000002',now(),'Reason')$q$,'23514','trusted writes require an admin resolver');
ROLLBACK;
