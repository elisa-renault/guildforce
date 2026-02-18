-- Auto-capture core product events for activation and feature analytics

CREATE OR REPLACE FUNCTION public.log_product_event_from_wish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.product_events (user_id, guild_id, event_name, event_source, event_context, occurred_at)
    VALUES (
      NEW.user_id,
      NEW.guild_id,
      'wish_created',
      'db_trigger',
      jsonb_build_object('wish_id', NEW.id, 'roster_id', NEW.roster_id),
      COALESCE(NEW.created_at, timezone('utc', now()))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_event_wish_created ON public.class_wishes;
CREATE TRIGGER trg_product_event_wish_created
AFTER INSERT ON public.class_wishes
FOR EACH ROW
EXECUTE FUNCTION public.log_product_event_from_wish();

CREATE OR REPLACE FUNCTION public.log_product_event_from_poll_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id uuid;
BEGIN
  SELECT gp.guild_id
  INTO v_guild_id
  FROM public.guild_poll_questions gpq
  JOIN public.guild_polls gp ON gp.id = gpq.poll_id
  WHERE gpq.id = NEW.question_id;

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.product_events (user_id, guild_id, event_name, event_source, event_context, occurred_at)
    VALUES (
      NEW.user_id,
      v_guild_id,
      'poll_voted',
      'db_trigger',
      jsonb_build_object('response_id', NEW.id, 'question_id', NEW.question_id),
      COALESCE(NEW.created_at, timezone('utc', now()))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_event_poll_voted ON public.guild_poll_responses;
CREATE TRIGGER trg_product_event_poll_voted
AFTER INSERT ON public.guild_poll_responses
FOR EACH ROW
EXECUTE FUNCTION public.log_product_event_from_poll_response();

CREATE OR REPLACE FUNCTION public.log_product_event_from_forum_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guild_id uuid;
BEGIN
  SELECT fc.guild_id
  INTO v_guild_id
  FROM public.forum_topics ft
  JOIN public.forum_categories fc ON fc.id = ft.category_id
  WHERE ft.id = NEW.topic_id;

  IF NEW.author_id IS NOT NULL THEN
    INSERT INTO public.product_events (user_id, guild_id, event_name, event_source, event_context, occurred_at)
    VALUES (
      NEW.author_id,
      v_guild_id,
      'forum_post_created',
      'db_trigger',
      jsonb_build_object('post_id', NEW.id, 'topic_id', NEW.topic_id),
      COALESCE(NEW.created_at, timezone('utc', now()))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_event_forum_post_created ON public.forum_posts;
CREATE TRIGGER trg_product_event_forum_post_created
AFTER INSERT ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.log_product_event_from_forum_post();
