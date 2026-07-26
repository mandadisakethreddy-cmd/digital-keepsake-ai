-- Storage: remove broad read policies
DROP POLICY IF EXISTS "anon read wish media" ON storage.objects;
DROP POLICY IF EXISTS "auth read wish media" ON storage.objects;
CREATE POLICY "owner read wish media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'wish-media' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- Wishes: remove blanket public read
DROP POLICY IF EXISTS "anyone can view by token" ON public.wishes;

-- Token-scoped read via security definer function
CREATE OR REPLACE FUNCTION public.get_wish_by_token(_token text)
RETURNS TABLE (
  id uuid,
  sender_name text,
  recipient_name text,
  letter text,
  media_urls jsonb,
  created_at timestamptz,
  birthday_date date,
  birthday_time time,
  view_duration_hours integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.sender_name, w.recipient_name, w.letter, w.media_urls,
         w.created_at, w.birthday_date, w.birthday_time, w.view_duration_hours
  FROM public.wishes w
  WHERE _token IS NOT NULL AND length(_token) >= 8 AND w.share_token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_wish_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wish_by_token(text) TO anon, authenticated;