-- RotaOperational: isolate application login from publicly readable user records.
-- Password changes must be performed separately by an administrator; do not
-- put temporary passwords or password hashes in source control.
CREATE OR REPLACE FUNCTION public.router_verify_login(
  p_username text,
  p_password text
)
RETURNS TABLE(username text, name text, role text, is_master boolean, unid text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT u.username, u.name, u.role, COALESCE(u.is_master, false), u.unid
  FROM public.app_users AS u
  WHERE u.username = lower(btrim(p_username))
    AND left(u.password, 4) = '$2a$'
    AND u.password = extensions.crypt(p_password, u.password)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.router_verify_login(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.router_verify_login(text, text) TO service_role;

-- Block client-side access to user rows, including legacy plaintext passwords.
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_users FROM anon, authenticated;
