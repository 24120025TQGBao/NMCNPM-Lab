BEGIN;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;

CREATE FUNCTION app_private.active_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.nguoi_dung WHERE ma_nd=auth.uid() AND trang_thai='ACTIVE')
$$;
CREATE FUNCTION app_private.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.nguoi_dung WHERE ma_nd=auth.uid() AND trang_thai='ACTIVE' AND vai_tro='ADMIN')
$$;
CREATE FUNCTION app_private.owns_recipe(id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.cong_thuc WHERE ma_ct=id AND ma_nguoi_tao=auth.uid())
$$;
CREATE FUNCTION app_private.owns_restaurant(id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.quan_an WHERE ma_quan=id AND ma_chu_so_huu=auth.uid())
$$;
CREATE FUNCTION app_private.public_post(id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.bai_dang WHERE ma_bai=id AND trang_thai='PUBLIC')
$$;
CREATE FUNCTION app_private.owns_post(id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM public.bai_dang WHERE ma_bai=id AND ma_tac_gia=auth.uid())
$$;
CREATE FUNCTION app_private.read_attachment(post_id bigint,comment_id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT app_private.is_admin() OR EXISTS (
    SELECT 1 FROM public.bai_dang p WHERE p.ma_bai=post_id
      AND (p.trang_thai='PUBLIC' OR (app_private.active_user() AND p.ma_tac_gia=auth.uid()))
  ) OR EXISTS (
    SELECT 1 FROM public.binh_luan c JOIN public.bai_dang p USING(ma_bai) WHERE c.ma_bl=comment_id
      AND ((c.trang_thai='PUBLIC' AND p.trang_thai='PUBLIC') OR (app_private.active_user() AND c.ma_tac_gia=auth.uid()))
  )
$$;
CREATE FUNCTION app_private.owns_attachment(post_id bigint,comment_id bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT app_private.owns_post(post_id) OR EXISTS (
    SELECT 1 FROM public.binh_luan c JOIN public.bai_dang p USING(ma_bai)
    WHERE c.ma_bl=comment_id AND c.ma_tac_gia=auth.uid() AND c.trang_thai='PUBLIC' AND p.trang_thai='PUBLIC'
  )
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO anon, authenticated;

-- BEFORE triggers also protect writes made through pre-existing SECURITY DEFINER RPCs.
CREATE FUNCTION app_private.guard_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); admin boolean:=app_private.is_admin(); state text; owner_id uuid;
BEGIN
  IF TG_OP='DELETE' AND TG_TABLE_NAME IN ('bai_dang','binh_luan','bao_cao') THEN
    RAISE EXCEPTION 'Content and reports must be retained; use soft deletion' USING ERRCODE='23514';
  END IF;
  -- Direct maintenance and the server service role are trusted. Never accept an actor ID from the client as authentication.
  IF actor IS NULL THEN
    IF coalesce(auth.role(),'') IN ('anon','authenticated') THEN
      RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF NOT app_private.active_user() THEN RAISE EXCEPTION 'Account is locked or missing' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' THEN
    -- No reparenting, creator changes, or changing immutable identity/timestamps.
    IF EXISTS (SELECT 1 FROM jsonb_each(to_jsonb(OLD)) v WHERE v.key IN
      ('ma_nd','ma_bai','ma_bl','ma_bao_cao','ma_tac_gia','ma_nguoi_tao','ma_chu_so_huu','ma_nguoi_bao_cao','tao_luc')
      AND v.value IS DISTINCT FROM to_jsonb(NEW)->v.key)
      OR (TG_TABLE_NAME='cong_thuc' AND (to_jsonb(NEW)->'ma_ct',to_jsonb(NEW)->'ma_mon') IS DISTINCT FROM (to_jsonb(OLD)->'ma_ct',to_jsonb(OLD)->'ma_mon'))
      OR (TG_TABLE_NAME='quan_an' AND to_jsonb(NEW)->'ma_quan' IS DISTINCT FROM to_jsonb(OLD)->'ma_quan') THEN
      RAISE EXCEPTION 'Identity, creator and creation timestamp are immutable' USING ERRCODE='42501';
    END IF;
  END IF;
  CASE TG_TABLE_NAME
  WHEN 'nguoi_dung' THEN
    IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'Profiles are created by Auth' USING ERRCODE='42501'; END IF;
    IF NOT admin AND (OLD.ma_nd<>actor OR NEW.vai_tro<>OLD.vai_tro OR NEW.trang_thai<>OLD.trang_thai) THEN
      RAISE EXCEPTION 'Cannot change account privileges' USING ERRCODE='42501';
    END IF;
    IF admin AND OLD.ma_nd<>actor AND (NEW.ten_hien_thi,NEW.anh_dai_dien) IS DISTINCT FROM (OLD.ten_hien_thi,OLD.anh_dai_dien) THEN
      RAISE EXCEPTION 'Cannot edit another user profile' USING ERRCODE='42501';
    END IF;
  WHEN 'quan_an' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Use soft deletion' USING ERRCODE='23514'; END IF;
    IF NEW.ma_chu_so_huu<>actor OR (TG_OP='UPDATE' AND OLD.ma_chu_so_huu<>actor) THEN
      RAISE EXCEPTION 'Only the recorded creator manages this restaurant' USING ERRCODE='42501';
    END IF;
  WHEN 'cong_thuc' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Use soft deletion' USING ERRCODE='23514'; END IF;
    IF NOT admin AND (NEW.ma_nguoi_tao IS DISTINCT FROM actor OR (TG_OP='UPDATE' AND OLD.ma_nguoi_tao IS DISTINCT FROM actor)) THEN
      RAISE EXCEPTION 'Only the creator manages this recipe' USING ERRCODE='42501';
    END IF;
  WHEN 'bai_dang', 'binh_luan' THEN
    IF TG_OP='UPDATE' THEN
      IF OLD.ma_tac_gia<>actor THEN
        IF NOT admin OR NEW.trang_thai NOT IN ('HIDDEN',OLD.trang_thai)
          OR (to_jsonb(NEW)-ARRAY['trang_thai','sua_luc']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['trang_thai','sua_luc']) THEN
          RAISE EXCEPTION 'Moderators may only hide others content' USING ERRCODE='42501';
        END IF;
      ELSIF OLD.trang_thai IN ('HIDDEN','DELETED') AND NEW.trang_thai<>OLD.trang_thai AND NOT admin THEN
        RAISE EXCEPTION 'Cannot restore hidden/deleted content' USING ERRCODE='42501';
      END IF;
    ELSIF NEW.ma_tac_gia<>actor THEN RAISE EXCEPTION 'Cannot impersonate an author' USING ERRCODE='42501'; END IF;
    IF TG_OP='INSERT' AND NEW.trang_thai IN ('HIDDEN','DELETED') THEN RAISE EXCEPTION 'Invalid initial state' USING ERRCODE='23514'; END IF;
    IF TG_OP='UPDATE' AND OLD.trang_thai<>NEW.trang_thai AND NEW.trang_thai='HIDDEN' AND NOT admin THEN
      RAISE EXCEPTION 'Only admins hide content' USING ERRCODE='42501';
    END IF;
    IF TG_TABLE_NAME='binh_luan' AND (TG_OP='INSERT' OR NEW.trang_thai='PUBLIC') THEN
      SELECT trang_thai INTO state FROM public.bai_dang WHERE ma_bai=NEW.ma_bai FOR SHARE;
      IF state IS DISTINCT FROM 'PUBLIC' THEN RAISE EXCEPTION 'Post is not public' USING ERRCODE='23514'; END IF;
    END IF;
  WHEN 'cam_xuc' THEN
    IF TG_OP='DELETE' THEN owner_id:=OLD.ma_nd; ELSE owner_id:=NEW.ma_nd; END IF;
    IF owner_id<>actor THEN RAISE EXCEPTION 'Cannot change another users reaction' USING ERRCODE='42501'; END IF;
    IF TG_OP<>'DELETE' THEN
      SELECT trang_thai INTO state FROM public.bai_dang WHERE ma_bai=NEW.ma_bai FOR SHARE;
      IF state IS DISTINCT FROM 'PUBLIC' THEN RAISE EXCEPTION 'Post is not public' USING ERRCODE='23514'; END IF;
    END IF;
  WHEN 'bao_cao' THEN
    IF TG_OP='INSERT' AND (NEW.ma_nguoi_bao_cao<>actor OR NEW.trang_thai<>'PENDING') THEN
      RAISE EXCEPTION 'Reports must start pending under your identity' USING ERRCODE='42501';
    END IF;
    IF TG_OP='UPDATE' THEN
      IF NOT admin OR OLD.trang_thai<>'PENDING' OR NEW.trang_thai NOT IN ('RESOLVED','DISMISSED')
        OR NEW.ma_nguoi_xu_ly IS DISTINCT FROM actor
        OR (NEW.ma_bai,NEW.ma_bl,NEW.ly_do) IS DISTINCT FROM (OLD.ma_bai,OLD.ma_bl,OLD.ly_do) THEN
        RAISE EXCEPTION 'Only an active admin can resolve a pending report' USING ERRCODE='42501';
      END IF;
      NEW.thoi_diem_xu_ly:=clock_timestamp();
    END IF;
  END CASE;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['nguoi_dung','quan_an','cong_thuc','bai_dang','binh_luan','cam_xuc','bao_cao'] LOOP
    EXECUTE format('CREATE TRIGGER guard_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.guard_write()',t);
  END LOOP;
END $$;

-- Both permissive and restrictive policies are deliberate: old permissive policies cannot widen access.
-- Existing restrictive policies remain effective and must be reviewed by the preflight audit.
DO $$
DECLARE r record; action text; expr text; visibility text; writable text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('nguoi_dung','ma_nd=auth.uid() OR app_private.is_admin()','ma_nd=auth.uid() OR app_private.is_admin()','false'),
    ('mon_an','trang_thai=''ACTIVE'' OR app_private.is_admin()','app_private.is_admin()','app_private.is_admin()'),
    ('thuoc_tinh_mon','true','app_private.is_admin()','app_private.is_admin()'),
    ('nguyen_lieu','true','app_private.is_admin()','app_private.is_admin()'),
    ('mon_an_thuoc_tinh','true','app_private.is_admin()','app_private.is_admin()'),
    ('so_thich_nguoi_dung','ma_nd=auth.uid()','ma_nd=auth.uid()','ma_nd=auth.uid()'),
    ('han_che_nguyen_lieu','ma_nd=auth.uid()','ma_nd=auth.uid()','ma_nd=auth.uid()'),
    ('mon_yeu_thich','ma_nd=auth.uid()','ma_nd=auth.uid() AND EXISTS (SELECT 1 FROM public.mon_an m WHERE m.ma_mon=mon_yeu_thich.ma_mon AND m.trang_thai=''ACTIVE'')','ma_nd=auth.uid()'),
    ('cong_thuc','trang_thai=''ACTIVE'' OR app_private.owns_recipe(ma_ct) OR app_private.is_admin()',
      'ma_nguoi_tao=auth.uid() OR app_private.is_admin()','false'),
    ('ct_nguyen_lieu','EXISTS(SELECT 1 FROM public.cong_thuc c WHERE c.ma_ct=ct_nguyen_lieu.ma_ct)',
      'app_private.owns_recipe(ma_ct) OR app_private.is_admin()','app_private.owns_recipe(ma_ct) OR app_private.is_admin()'),
    ('buoc_cong_thuc','EXISTS(SELECT 1 FROM public.cong_thuc c WHERE c.ma_ct=buoc_cong_thuc.ma_ct)',
      'app_private.owns_recipe(ma_ct) OR app_private.is_admin()','app_private.owns_recipe(ma_ct) OR app_private.is_admin()'),
    ('quan_an','trang_thai=''ACTIVE'' OR app_private.owns_restaurant(ma_quan) OR app_private.is_admin()',
      'ma_chu_so_huu=auth.uid()','false'),
    ('thuc_don','EXISTS(SELECT 1 FROM public.quan_an q WHERE q.ma_quan=thuc_don.ma_quan)',
      'app_private.owns_restaurant(ma_quan)','app_private.owns_restaurant(ma_quan)'),
    ('bai_dang','trang_thai=''PUBLIC'' OR (app_private.active_user() AND ma_tac_gia=auth.uid()) OR app_private.is_admin()',
      'ma_tac_gia=auth.uid() OR app_private.is_admin()','false'),
    ('binh_luan','(trang_thai=''PUBLIC'' AND app_private.public_post(ma_bai)) OR (app_private.active_user() AND ma_tac_gia=auth.uid()) OR app_private.is_admin()',
      'ma_tac_gia=auth.uid() OR app_private.is_admin()','false'),
    ('cam_xuc','app_private.public_post(ma_bai) OR (app_private.active_user() AND ma_nd=auth.uid()) OR app_private.is_admin()',
      'ma_nd=auth.uid() AND app_private.public_post(ma_bai)','ma_nd=auth.uid()'),
    ('tep_dinh_kem','app_private.read_attachment(ma_bai,ma_bl)',
      'app_private.owns_attachment(ma_bai,ma_bl)','app_private.owns_attachment(ma_bai,ma_bl)'),
    ('bao_cao','(app_private.active_user() AND ma_nguoi_bao_cao=auth.uid()) OR app_private.is_admin()',
      'ma_nguoi_bao_cao=auth.uid() OR app_private.is_admin()','false')
  ) AS p(t,read_expr,write_expr,delete_expr) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',r.t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon,authenticated',r.t);
    EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO authenticated',r.t);
    FOREACH action IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      expr:=CASE action WHEN 'SELECT' THEN r.read_expr WHEN 'DELETE' THEN r.delete_expr ELSE r.write_expr END;
      IF action<>'SELECT' THEN expr:='app_private.active_user() AND ('||expr||')'; END IF;
      visibility:=CASE WHEN action='INSERT' THEN '' ELSE ' USING ('||expr||')' END;
      writable:=CASE WHEN action IN ('INSERT','UPDATE') THEN ' WITH CHECK ('||expr||')' ELSE '' END;
      EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO anon,authenticated%s%s',
        'requirements_allow_'||lower(action),r.t,action,visibility,writable);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO anon,authenticated%s%s',
        'requirements_limit_'||lower(action),r.t,action,visibility,writable);
    END LOOP;
  END LOOP;
END $$;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE ALL ON FUNCTION app_private.guard_write() FROM PUBLIC,anon,authenticated;
COMMIT;
