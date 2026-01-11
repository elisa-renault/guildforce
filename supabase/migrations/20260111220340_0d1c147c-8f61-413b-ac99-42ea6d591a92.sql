-- Trigger to log new wishes created
CREATE OR REPLACE FUNCTION public.log_wish_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.log_guild_activity(
        NEW.guild_id,
        NEW.user_id,
        'wish_created',
        jsonb_build_object(
            'class_id', NEW.class_id,
            'spec_ids', NEW.spec_ids,
            'choice_index', NEW.choice_index,
            'comment', NEW.comment
        ),
        NEW.user_id,
        NEW.roster_id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_wish_created
AFTER INSERT ON public.class_wishes
FOR EACH ROW
EXECUTE FUNCTION public.log_wish_created();

-- Trigger to log wish content changes (not just validation)
CREATE OR REPLACE FUNCTION public.log_wish_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if content changed (not validation status which has its own trigger)
    IF (OLD.class_id IS DISTINCT FROM NEW.class_id 
        OR OLD.spec_ids IS DISTINCT FROM NEW.spec_ids 
        OR OLD.comment IS DISTINCT FROM NEW.comment
        OR OLD.choice_index IS DISTINCT FROM NEW.choice_index)
       AND OLD.validation_status IS NOT DISTINCT FROM NEW.validation_status THEN
        PERFORM public.log_guild_activity(
            NEW.guild_id,
            NEW.user_id,
            'wish_updated',
            jsonb_build_object(
                'old_class_id', OLD.class_id,
                'new_class_id', NEW.class_id,
                'old_spec_ids', OLD.spec_ids,
                'new_spec_ids', NEW.spec_ids,
                'old_choice_index', OLD.choice_index,
                'new_choice_index', NEW.choice_index
            ),
            NEW.user_id,
            NEW.roster_id
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_wish_updated
AFTER UPDATE ON public.class_wishes
FOR EACH ROW
EXECUTE FUNCTION public.log_wish_updated();

-- Trigger to log wish deletions
CREATE OR REPLACE FUNCTION public.log_wish_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.log_guild_activity(
        OLD.guild_id,
        OLD.user_id,
        'wish_deleted',
        jsonb_build_object(
            'class_id', OLD.class_id,
            'spec_ids', OLD.spec_ids,
            'choice_index', OLD.choice_index
        ),
        OLD.user_id,
        OLD.roster_id
    );
    RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_log_wish_deleted
AFTER DELETE ON public.class_wishes
FOR EACH ROW
EXECUTE FUNCTION public.log_wish_deleted();