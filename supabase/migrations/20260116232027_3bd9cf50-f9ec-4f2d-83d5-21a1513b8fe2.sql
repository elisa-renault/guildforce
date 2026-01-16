-- Add show_battletag column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_battletag BOOLEAN DEFAULT true;

-- Create account deletion requests table
CREATE TABLE public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint for processed_by (references profiles instead of auth.users)
ALTER TABLE public.account_deletion_requests
ADD CONSTRAINT account_deletion_requests_processed_by_fkey
FOREIGN KEY (processed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own deletion request
CREATE POLICY "Users can create deletion request" 
ON public.account_deletion_requests
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own request
CREATE POLICY "Users can view own request" 
ON public.account_deletion_requests
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Users can cancel their own pending request
CREATE POLICY "Users can cancel own pending request" 
ON public.account_deletion_requests
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Admins can view all requests
CREATE POLICY "Admins can view all requests" 
ON public.account_deletion_requests
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can process requests
CREATE POLICY "Admins can process requests" 
ON public.account_deletion_requests
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));