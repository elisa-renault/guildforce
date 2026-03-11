do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'poll_question_analysis_intent'
  ) then
    create type public.poll_question_analysis_intent as enum ('decision', 'informative');
  end if;
end $$;

alter table public.guild_poll_questions
  add column if not exists analysis_intent public.poll_question_analysis_intent;

comment on column public.guild_poll_questions.analysis_intent is
  'Explicit analytics intent for result signaling. NULL keeps legacy decision-oriented behavior.';
