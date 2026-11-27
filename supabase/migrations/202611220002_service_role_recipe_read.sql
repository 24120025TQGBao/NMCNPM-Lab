-- Backend dish matching and recipe detail reads use service_role.
GRANT SELECT ON public.han_che_nguyen_lieu TO service_role;
GRANT SELECT ON public.thong_tin_cong_thuc TO service_role;
NOTIFY pgrst, 'reload schema';
