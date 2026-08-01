ALTER TABLE public.wishes
  ADD COLUMN IF NOT EXISTS unlock_time_utc timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS event_status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS unlock_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_unlocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.wishes
  DROP CONSTRAINT IF EXISTS wishes_event_status_check;
ALTER TABLE public.wishes
  ADD CONSTRAINT wishes_event_status_check
  CHECK (event_status IN ('draft', 'scheduled', 'unlocked'));

UPDATE public.wishes
SET unlock_time_utc = COALESCE(
  unlock_time_utc,
  CASE
    WHEN birthday_date IS NOT NULL
      THEN (birthday_date::timestamp + COALESCE(birthday_time, '00:00'::time)) AT TIME ZONE 'UTC'
    ELSE created_at
  END
);

ALTER TABLE public.wishes ALTER COLUMN unlock_time_utc SET NOT NULL;
ALTER TABLE public.wishes ALTER COLUMN unlock_time_utc SET DEFAULT now();

UPDATE public.wishes
SET event_status = 'unlocked', is_unlocked = true
WHERE unlock_time_utc <= now();

CREATE TABLE public.wish_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.wishes(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  old_unlock_time timestamptz,
  new_unlock_time timestamptz NOT NULL,
  timezone text NOT NULL,
  ip_address text,
  device text,
  browser text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wish_audit_logs_event_id_idx ON public.wish_audit_logs (event_id, created_at DESC);

GRANT SELECT ON public.wish_audit_logs TO authenticated;
GRANT ALL ON public.wish_audit_logs TO service_role;

ALTER TABLE public.wish_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read own audit logs"
ON public.wish_audit_logs
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.wishes w
  WHERE w.id = wish_audit_logs.event_id AND w.owner_id = auth.uid()
));

DROP FUNCTION IF EXISTS public.get_wish_by_token(text);

CREATE FUNCTION public.get_wish_by_token(_token text)
RETURNS TABLE(
  id uuid,
  sender_name text,
  recipient_name text,
  letter text,
  media_urls jsonb,
  created_at timestamp with time zone,
  birthday_date date,
  birthday_time time without time zone,
  view_duration_hours integer,
  unlock_time_utc timestamp with time zone,
  timezone text,
  event_status text,
  is_unlocked boolean,
  unlock_version integer,
  server_now timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT w.id, w.sender_name, w.recipient_name, w.letter, w.media_urls,
         w.created_at, w.birthday_date, w.birthday_time, w.view_duration_hours,
         w.unlock_time_utc, w.timezone, w.event_status, w.is_unlocked,
         w.unlock_version, now()
  FROM public.wishes w
  WHERE _token IS NOT NULL AND length(_token) >= 8 AND w.share_token = _token
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_wish_by_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wish_by_token(text) TO service_role;