-- Drop existing triggers that don't capture user correctly
DROP TRIGGER IF EXISTS trigger_log_wish_created ON public.class_wishes;
DROP TRIGGER IF EXISTS trigger_log_wish_updated ON public.class_wishes;
DROP TRIGGER IF EXISTS trigger_log_wish_deleted ON public.class_wishes;
DROP TRIGGER IF EXISTS trigger_log_wish_validation ON public.class_wishes;

-- Create a new trigger function that captures user_id from the row itself
CREATE OR REPLACE FUNCTION public.log_wish_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type TEXT;
  v_action_details JSONB;
  v_target_user_id UUID;
  v_roster_id UUID;
  v_guild_id UUID;
  v_actor_user_id UUID;
BEGIN
  -- Determine action type and details based on operation
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'wish_created';
    v_action_details := jsonb_build_object(
      'class_id', NEW.class_id,
      'spec_ids', NEW.spec_ids,
      'choice_index', NEW.choice_index
    );
    v_target_user_id := NEW.user_id;
    v_actor_user_id := NEW.user_id; -- The user creating their own wish
    v_roster_id := NEW.roster_id;
    v_guild_id := NEW.guild_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if it's a validation change (done by GM)
    IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
      v_action_type := 'wish_validation';
      v_action_details := jsonb_build_object(
        'class_id', NEW.class_id,
        'spec_ids', NEW.spec_ids,
        'old_status', OLD.validation_status,
        'new_status', NEW.validation_status
      );
      v_target_user_id := NEW.user_id;
      v_actor_user_id := NEW.validated_by; -- GM who validated
      v_roster_id := NEW.roster_id;
      v_guild_id := NEW.guild_id;
    -- Otherwise it's a content update (done by the wish owner)
    ELSIF (OLD.class_id IS DISTINCT FROM NEW.class_id) OR (OLD.spec_ids IS DISTINCT FROM NEW.spec_ids) OR (OLD.comment IS DISTINCT FROM NEW.comment) THEN
      v_action_type := 'wish_updated';
      v_action_details := jsonb_build_object(
        'old_class_id', OLD.class_id,
        'new_class_id', NEW.class_id,
        'old_spec_ids', OLD.spec_ids,
        'new_spec_ids', NEW.spec_ids,
        'old_choice_index', OLD.choice_index,
        'new_choice_index', NEW.choice_index
      );
      v_target_user_id := NEW.user_id;
      v_actor_user_id := NEW.user_id; -- User updating their own wish
      v_roster_id := NEW.roster_id;
      v_guild_id := NEW.guild_id;
    ELSE
      -- No significant change to log
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'wish_deleted';
    v_action_details := jsonb_build_object(
      'class_id', OLD.class_id,
      'spec_ids', OLD.spec_ids,
      'choice_index', OLD.choice_index
    );
    v_target_user_id := OLD.user_id;
    v_actor_user_id := OLD.user_id; -- User deleting their own wish
    v_roster_id := OLD.roster_id;
    v_guild_id := OLD.guild_id;
  END IF;

  -- Insert the log entry
  INSERT INTO public.guild_activity_logs (
    guild_id,
    user_id,
    action_type,
    action_details,
    target_user_id,
    roster_id
  ) VALUES (
    v_guild_id,
    v_actor_user_id,
    v_action_type,
    v_action_details,
    v_target_user_id,
    v_roster_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a single trigger for all wish operations
CREATE TRIGGER trigger_log_wish_activity
AFTER INSERT OR UPDATE OR DELETE ON public.class_wishes
FOR EACH ROW
EXECUTE FUNCTION public.log_wish_activity();