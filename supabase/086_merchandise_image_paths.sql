-- Mehrere Produktfotos (bis zu 3) pro Merchandise-Artikel
ALTER TABLE public.merchandise_products
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

UPDATE public.merchandise_products
SET image_paths = ARRAY[image_path]
WHERE image_path IS NOT NULL
  AND (image_paths IS NULL OR image_paths = '{}');
