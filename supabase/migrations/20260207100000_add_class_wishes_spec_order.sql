-- Add ordered spec priorities to class wishes
ALTER TABLE public.class_wishes
  ADD COLUMN spec_order TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.class_wishes.spec_order IS 'Ordered spec ids for priority (index 1 = main). Empty array means default ordering.';
