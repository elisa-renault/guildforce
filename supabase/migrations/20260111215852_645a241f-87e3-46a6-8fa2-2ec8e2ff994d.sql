-- Create audit log table for tracking guild activities
CREATE TABLE public.guild_activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    action_details JSONB DEFAULT '{}',
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    roster_id UUID REFERENCES public.rosters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_guild_activity_logs_guild_id ON public.guild_activity_logs(guild_id);
CREATE INDEX idx_guild_activity_logs_created_at ON public.guild_activity_logs(created_at DESC);
CREATE INDEX idx_guild_activity_logs_action_type ON public.guild_activity_logs(action_type);

-- Enable RLS
ALTER TABLE public.guild_activity_logs ENABLE ROW LEVEL SECURITY;

-- GMs and members can view their guild's activity logs
CREATE POLICY "Guild members can view activity logs"
ON public.guild_activity_logs
FOR SELECT
USING (
    public.is_guild_member(guild_id, auth.uid())
);

-- Only system (via triggers) or GMs can insert logs
CREATE POLICY "GMs can insert activity logs"
ON public.guild_activity_logs
FOR INSERT
WITH CHECK (
    public.is_guild_gm(guild_id, auth.uid()) OR public.is_guild_owner_or_gm(guild_id)
);

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_guild_activity(
    p_guild_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_action_details JSONB DEFAULT '{}',
    p_target_user_id UUID DEFAULT NULL,
    p_roster_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.guild_activity_logs (
        guild_id, user_id, action_type, action_details, target_user_id, roster_id
    ) VALUES (
        p_guild_id, p_user_id, p_action_type, p_action_details, p_target_user_id, p_roster_id
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Trigger to log wish validation changes
CREATE OR REPLACE FUNCTION public.log_wish_validation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if validation_status changed
    IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
        PERFORM public.log_guild_activity(
            NEW.guild_id,
            NEW.validated_by,
            'wish_validation',
            jsonb_build_object(
                'old_status', OLD.validation_status,
                'new_status', NEW.validation_status,
                'class_id', NEW.class_id,
                'spec_ids', NEW.spec_ids,
                'choice_index', NEW.choice_index
            ),
            NEW.user_id,
            NEW.roster_id
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_wish_validation
AFTER UPDATE ON public.class_wishes
FOR EACH ROW
EXECUTE FUNCTION public.log_wish_validation_change();

-- Trigger to log new guild members
CREATE OR REPLACE FUNCTION public.log_member_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.log_guild_activity(
        NEW.guild_id,
        NEW.user_id,
        'member_joined',
        jsonb_build_object(
            'role', NEW.role,
            'status', NEW.status
        ),
        NEW.user_id,
        NULL
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_member_joined
AFTER INSERT ON public.guild_members
FOR EACH ROW
EXECUTE FUNCTION public.log_member_joined();

-- Trigger to log roster changes
CREATE OR REPLACE FUNCTION public.log_roster_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_guild_activity(
            NEW.guild_id,
            NULL,
            'roster_created',
            jsonb_build_object(
                'name', NEW.name,
                'description', NEW.description
            ),
            NULL,
            NEW.id
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.name IS DISTINCT FROM NEW.name OR OLD.description IS DISTINCT FROM NEW.description THEN
            PERFORM public.log_guild_activity(
                NEW.guild_id,
                NULL,
                'roster_updated',
                jsonb_build_object(
                    'old_name', OLD.name,
                    'new_name', NEW.name,
                    'old_description', OLD.description,
                    'new_description', NEW.description
                ),
                NULL,
                NEW.id
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_guild_activity(
            OLD.guild_id,
            NULL,
            'roster_deleted',
            jsonb_build_object(
                'name', OLD.name
            ),
            NULL,
            NULL
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_log_roster_change
AFTER INSERT OR UPDATE OR DELETE ON public.rosters
FOR EACH ROW
EXECUTE FUNCTION public.log_roster_change();