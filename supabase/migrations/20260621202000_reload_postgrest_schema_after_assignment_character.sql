-- Ensure PostgREST exposes the updated set_roster_member_assignment RPC signature immediately.

NOTIFY pgrst, 'reload schema';
