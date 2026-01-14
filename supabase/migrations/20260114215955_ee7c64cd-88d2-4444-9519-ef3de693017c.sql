-- Trigger to log commitment/status changes
CREATE OR REPLACE FUNCTION public.log_member_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.log_guild_activity(
            NEW.guild_id,
            NEW.user_id,  -- The user who changed their status
            'commitment_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            ),
            NEW.user_id,  -- Target is also the user
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create the trigger for status updates
DROP TRIGGER IF EXISTS trigger_log_member_status_change ON public.guild_members;
CREATE TRIGGER trigger_log_member_status_change
AFTER UPDATE ON public.guild_members
FOR EACH ROW
EXECUTE FUNCTION public.log_member_status_change();