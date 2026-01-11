-- Add validation status to class_wishes
ALTER TABLE public.class_wishes 
ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for valid status values
ALTER TABLE public.class_wishes
ADD CONSTRAINT class_wishes_validation_status_check 
CHECK (validation_status IN ('pending', 'approved', 'rejected'));

-- Create index for filtering by validation status
CREATE INDEX idx_class_wishes_validation_status ON public.class_wishes(validation_status);

-- Comment for documentation
COMMENT ON COLUMN public.class_wishes.validation_status IS 'Validation status: pending, approved, or rejected';
COMMENT ON COLUMN public.class_wishes.validated_by IS 'User ID of the GM who validated the wish';
COMMENT ON COLUMN public.class_wishes.validated_at IS 'Timestamp when the wish was validated';