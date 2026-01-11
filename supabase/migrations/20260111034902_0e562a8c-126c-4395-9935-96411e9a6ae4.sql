-- Drop the existing check constraint on choice_index
ALTER TABLE public.class_wishes DROP CONSTRAINT IF EXISTS class_wishes_choice_index_check;

-- Add a new constraint allowing choice_index from 1 to 13 (number of WoW classes)
ALTER TABLE public.class_wishes ADD CONSTRAINT class_wishes_choice_index_check CHECK (choice_index >= 1 AND choice_index <= 13);