REVOKE ALL ON FUNCTION public.get_wish_by_token(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wish_by_token(text) TO service_role;