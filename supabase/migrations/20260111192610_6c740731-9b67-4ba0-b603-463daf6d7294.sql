-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add policies for forum_categories management by admins
CREATE POLICY "Admins can insert categories"
ON public.forum_categories
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.forum_categories
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.forum_categories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add policies for forum_moderators management by admins
CREATE POLICY "Admins can insert moderators"
ON public.forum_moderators
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update moderators"
ON public.forum_moderators
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete moderators"
ON public.forum_moderators
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));