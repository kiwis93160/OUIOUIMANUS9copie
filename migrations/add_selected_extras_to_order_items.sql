-- Ensure the order_items table can store the extras selected by clients
-- when placing online orders. This column is read and written by the
-- front-end whenever an order is created or synced.
ALTER TABLE IF EXISTS public.order_items
    ADD COLUMN IF NOT EXISTS selected_extras jsonb DEFAULT '[]'::jsonb;

-- Backfill legacy rows so that every record has a predictable shape.
UPDATE public.order_items
SET selected_extras = '[]'::jsonb
WHERE selected_extras IS NULL;

ALTER TABLE IF EXISTS public.order_items
    ALTER COLUMN selected_extras SET NOT NULL;

COMMENT ON COLUMN public.order_items.selected_extras IS
    'List of extras selected for this order item, stored as a JSON array of {extraName, optionName, price} objects.';
