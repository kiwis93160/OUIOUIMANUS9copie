-- Add a boolean flag that determines whether a product exposes the
-- automatically generated ingredient-removal extra in the apps.
ALTER TABLE IF EXISTS public.products
    ADD COLUMN IF NOT EXISTS allow_ingredient_removal_extra boolean DEFAULT false;

-- Enforce a consistent value for historical rows and prevent NULLs going forward.
UPDATE public.products
SET allow_ingredient_removal_extra = false
WHERE allow_ingredient_removal_extra IS NULL;

ALTER TABLE IF EXISTS public.products
    ALTER COLUMN allow_ingredient_removal_extra SET NOT NULL;

COMMENT ON COLUMN public.products.allow_ingredient_removal_extra IS
    'When true, the product exposes an automatically generated extra listing its recipe ingredients so staff or clients can deselect them.';
