-- Optional sample data for your EXISTING schema; run in Supabase SQL Editor.
-- Repeat runs skip matching names. No existing tables are changed.
INSERT INTO public.mon_an (ten_mon, mo_ta_ngan, trang_thai)
SELECT seed.ten_mon, seed.mo_ta_ngan, 'ACTIVE'
FROM (VALUES
  ('Phở bò', 'Món phở truyền thống Việt Nam'),
  ('Bún bò Huế', 'Món bún đặc trưng của Huế'),
  ('Cơm tấm', 'Cơm tấm với sườn nướng'),
  ('Bánh mì', 'Bánh mì Việt Nam'),
  ('Bún thịt nướng', 'Bún với thịt nướng và rau')
) AS seed(ten_mon, mo_ta_ngan)
WHERE NOT EXISTS (SELECT 1 FROM public.mon_an m WHERE m.ten_mon = seed.ten_mon);
