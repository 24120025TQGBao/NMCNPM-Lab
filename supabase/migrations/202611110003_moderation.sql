BEGIN;
-- Append-only history keeps the actor/role at decision time, even after role changes.
CREATE TABLE public.nhat_ky_kiem_duyet (
  ma_su_kien bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loai_doi_tuong text NOT NULL CHECK (loai_doi_tuong IN ('bai_dang','binh_luan','nguoi_dung','bao_cao')),
  ma_doi_tuong text NOT NULL,
  ma_nguoi_thuc_hien uuid REFERENCES public.nguoi_dung(ma_nd),
  vai_tro_luc_xu_ly text,
  trang_thai_truoc text,
  trang_thai_sau text NOT NULL,
  ly_do text,
  thoi_diem timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.nhat_ky_kiem_duyet ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.nhat_ky_kiem_duyet TO authenticated;
CREATE POLICY moderation_admin_read ON public.nhat_ky_kiem_duyet FOR SELECT TO authenticated USING (app_private.is_admin());

CREATE FUNCTION app_private.audit_state_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE reason text:=nullif(btrim(current_setting('app.moderation_reason',true)),''); id text; role_at_time text;
BEGIN
  IF NEW.trang_thai IS NOT DISTINCT FROM OLD.trang_thai THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='bao_cao' THEN reason:=NEW.ly_do_xu_ly; END IF;
  IF auth.uid() IS NOT NULL AND (NEW.trang_thai='HIDDEN' OR TG_TABLE_NAME='nguoi_dung') THEN
    IF NOT app_private.is_admin() OR reason IS NULL OR reason !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Admin state changes require a moderation reason; use moderate_content or set_account_state' USING ERRCODE='23514';
    END IF;
  END IF;
  id:=CASE TG_TABLE_NAME WHEN 'bai_dang' THEN to_jsonb(NEW)->>'ma_bai' WHEN 'binh_luan' THEN to_jsonb(NEW)->>'ma_bl'
       WHEN 'nguoi_dung' THEN to_jsonb(NEW)->>'ma_nd' ELSE to_jsonb(NEW)->>'ma_bao_cao' END;
  SELECT vai_tro INTO role_at_time FROM public.nguoi_dung WHERE ma_nd=auth.uid();
  INSERT INTO public.nhat_ky_kiem_duyet(loai_doi_tuong,ma_doi_tuong,ma_nguoi_thuc_hien,vai_tro_luc_xu_ly,trang_thai_truoc,trang_thai_sau,ly_do)
    VALUES (TG_TABLE_NAME,id,auth.uid(),role_at_time,OLD.trang_thai,NEW.trang_thai,reason);
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['bai_dang','binh_luan','nguoi_dung','bao_cao'] LOOP
    EXECUTE format('CREATE TRIGGER audit_state_change AFTER UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.audit_state_change()',t);
  END LOOP;
END $$;

CREATE FUNCTION public.moderate_content(target_type text,target_id bigint,reason text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NOT app_private.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF reason IS NULL OR reason !~ '[^[:space:]]' THEN RAISE EXCEPTION 'Reason required' USING ERRCODE='22023'; END IF;
  PERFORM set_config('app.moderation_reason',reason,true);
  IF target_type='POST' THEN UPDATE public.bai_dang SET trang_thai='HIDDEN' WHERE ma_bai=target_id AND trang_thai<>'DELETED';
  ELSIF target_type='COMMENT' THEN UPDATE public.binh_luan SET trang_thai='HIDDEN' WHERE ma_bl=target_id AND trang_thai<>'DELETED';
  ELSE RAISE EXCEPTION 'Target must be POST or COMMENT' USING ERRCODE='22023'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Content not found' USING ERRCODE='P0002'; END IF;
  PERFORM set_config('app.moderation_reason','',true);
END $$;
CREATE FUNCTION public.set_account_state(user_id uuid,new_state text,reason text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NOT app_private.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF new_state NOT IN ('ACTIVE','LOCKED') OR new_state IS NULL OR reason IS NULL OR reason !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'Valid state and reason required' USING ERRCODE='22023'; END IF;
  IF user_id=auth.uid() AND new_state='LOCKED' THEN RAISE EXCEPTION 'Cannot lock your own account' USING ERRCODE='22023'; END IF;
  PERFORM set_config('app.moderation_reason',reason,true);
  UPDATE public.nguoi_dung SET trang_thai=new_state WHERE ma_nd=user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE='P0002'; END IF;
  PERFORM set_config('app.moderation_reason','',true);
END $$;
CREATE FUNCTION public.resolve_report(report_id bigint,decision text,reason text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.bao_cao;
BEGIN
  IF NOT app_private.is_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF decision IS NULL OR decision NOT IN ('RESOLVED','DISMISSED') OR reason IS NULL OR reason !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'Valid decision and reason required' USING ERRCODE='22023'; END IF;
  SELECT * INTO r FROM public.bao_cao WHERE ma_bao_cao=report_id FOR UPDATE;
  IF NOT FOUND OR r.trang_thai<>'PENDING' THEN RAISE EXCEPTION 'Pending report not found' USING ERRCODE='P0002'; END IF;
  IF decision='RESOLVED' THEN
    PERFORM public.moderate_content(CASE WHEN r.ma_bai IS NOT NULL THEN 'POST' ELSE 'COMMENT' END,coalesce(r.ma_bai,r.ma_bl),reason);
  END IF;
  UPDATE public.bao_cao SET trang_thai=decision,ma_nguoi_xu_ly=auth.uid(),thoi_diem_xu_ly=clock_timestamp(),ly_do_xu_ly=reason
    WHERE ma_bao_cao=report_id;
END $$;
REVOKE ALL ON FUNCTION app_private.audit_state_change() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.moderate_content(text,bigint,text),public.set_account_state(uuid,text,text),public.resolve_report(bigint,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_content(text,bigint,text),public.set_account_state(uuid,text,text),public.resolve_report(bigint,text,text) TO authenticated;
COMMIT;
