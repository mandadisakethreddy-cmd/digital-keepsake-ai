## Add exact birthday unlock time (date + hour/minute)

Right now a wish only stores `birthday_date`, so the surprise unlocks at midnight local time on the birthday. This adds a precise time so the recipient can only open it starting at, say, 9:00 AM on their birthday.

### Schema
- Add `birthday_time time` column to `public.wishes` (nullable — when null, behaves like today: unlocks at 00:00).

### Create form (`src/routes/_authenticated/new.tsx`)
- Add a `<input type="time">` next to the birthday date field labeled "🕐 Unlock time".
- Default to `09:00`.
- Send `birthday_time` in the insert payload.

### Wish page (`src/routes/wish.$token.tsx`)
- Select `birthday_time` alongside the other fields.
- `isBirthdayToday` → replace with `isUnlocked`: compares `now` against `birthday_date + birthday_time` (fall back to 00:00 if null). Returns true only after that moment.
- `computeExpiry`: use the same combined datetime as the start, then add `view_duration_hours`.
- Countdown target when `waiting`: the exact unlock datetime (not midnight).
- Copy tweak on the waiting screen so it mentions the time, e.g. "Comes alive at 9:00 AM on Mar 14".

### Out of scope
- Timezone handling stays as viewer's local time (same as today's date-only behavior).
- No changes to media/letter/AI/auth flows.
