-- Model an earlier/partial dictionary with live canonical-name protection.
-- Keep this guard enabled: the migration must handle it without operator intervention.
CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(value text) RETURNS text
 LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $$
 SELECT btrim(regexp_replace(translate(lower(normalize(value, NFC)),
 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ',
 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),'[[:space:]]+',' ','g'))
$$;
ALTER TABLE nguyen_lieu ADD COLUMN ten_khong_dau text GENERATED ALWAYS AS (public.normalize_ingredient_name(ten_nl)) STORED;
CREATE TABLE public.nguyen_lieu_dong_nghia (
 ten_goi text NOT NULL,
 ten_khong_dau text GENERATED ALWAYS AS (public.normalize_ingredient_name(ten_goi)) STORED PRIMARY KEY,
 ma_nl bigint NOT NULL REFERENCES public.nguyen_lieu ON DELETE CASCADE,
 CHECK (public.normalize_ingredient_name(ten_goi)<>'')
);
INSERT INTO nguyen_lieu_dong_nghia(ten_goi,ma_nl)
 SELECT DISTINCT ON (ten_khong_dau) ten_nl,ma_nl FROM nguyen_lieu ORDER BY ten_khong_dau,ma_nl;
CREATE FUNCTION app_private.protect_ingredient_name() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.nguyen_lieu n WHERE n.ten_khong_dau=OLD.ten_khong_dau AND n.ma_nl=OLD.ma_nl)
 AND (TG_OP='DELETE' OR NEW.ma_nl<>OLD.ma_nl OR NEW.ten_goi<>OLD.ten_goi) THEN
 RAISE EXCEPTION 'Canonical name registry entry is required' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_ingredient_name BEFORE UPDATE OR DELETE ON public.nguyen_lieu_dong_nghia
 FOR EACH ROW EXECUTE FUNCTION app_private.protect_ingredient_name();
