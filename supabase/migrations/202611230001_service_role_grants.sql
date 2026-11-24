-- Backend (service_role) must read these objects when it calls RPCs and recipe queries:
--   * match_dishes is SECURITY INVOKER and joins han_che_nguyen_lieu (allergy/dietary restrictions).
--   * thong_tin_cong_thuc exposes du_thong_tin_huong_dan (recipe has enough information to cook).
-- Safe to rerun. Requires migrations 202611110004 and 202611220001.
BEGIN;
GRANT SELECT ON public.han_che_nguyen_lieu TO service_role;
GRANT SELECT ON public.thong_tin_cong_thuc TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
