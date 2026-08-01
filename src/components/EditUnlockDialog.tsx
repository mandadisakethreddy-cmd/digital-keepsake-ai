import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { updateUnlockTime, listAuditLogs } from "@/lib/schedule.functions";
import { browserTimeZone, formatInTz, timeZoneList, utcToZonedParts, zonedToUtc } from "@/lib/tz";

export type EditableEvent = {
  id: string;
  recipient_name: string;
  unlock_time_utc: string;
  timezone: string;
  event_status: string;
  is_unlocked: boolean;
  unlock_version: number;
};

type AuditRow = {
  id: string;
  old_unlock_time: string | null;
  new_unlock_time: string;
  timezone: string;
  device: string | null;
  browser: string | null;
  created_at: string;
};

export function EditUnlockDialog({
  event,
  onClose,
  onSaved,
}: {
  event: EditableEvent;
  onClose: () => void;
  onSaved: (updated: { unlockTimeUTC: string; timezone: string; eventStatus: string; unlockVersion: number }) => void;
}) {
  const save = useServerFn(updateUnlockTime);
  const loadLogs = useServerFn(listAuditLogs);

  const zones = useMemo(() => timeZoneList(), []);
  const [tz, setTz] = useState(event.timezone || browserTimeZone());
  const initial = useMemo(
    () => utcToZonedParts(new Date(event.unlock_time_utc), event.timezone || browserTimeZone()),
    [event.unlock_time_utc, event.timezone],
  );
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await loadLogs({ data: { eventId: event.id } });
        setLogs(res.logs as AuditRow[]);
      } catch {
        setLogs([]);
      }
    })();
     
  }, [event.id]);

  const preview = useMemo(() => {
    try {
      return zonedToUtc(date, time, tz);
    } catch {
      return null;
    }
  }, [date, time, tz]);

  const editable = !event.is_unlocked && (event.event_status === "draft" || event.event_status === "scheduled");

  async function doSave() {
    setBusy(true);
    try {
      const res = await save({
        data: {
          eventId: event.id,
          unlockDate: date,
          unlockTime: time,
          timezone: tz,
          expectedVersion: event.unlock_version,
          reason: reason || undefined,
        },
      });
      toast.success("Your birthday surprise unlock time has been updated successfully.");
      onSaved(res);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the unlock time");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bday-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold">🕐 Edit unlock time</h2>

        {!editable ? (
          <>
            <p className="text-sm">
              This surprise has already been opened and cannot be locked again.
            </p>
            <button onClick={onClose} className="bday-btn px-4 py-2 text-sm w-full">Close</button>
          </>
        ) : confirming ? (
          <>
            <div className="text-sm space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Current unlock time</div>
                <div className="font-semibold">
                  {formatInTz(new Date(event.unlock_time_utc), event.timezone || tz)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">New unlock time</div>
                <div className="font-semibold">
                  {preview ? formatInTz(preview, tz) : "—"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} disabled={busy} className="flex-1 border rounded-md py-2 text-sm">
                Cancel
              </button>
              <button onClick={doSave} disabled={busy} className="bday-btn flex-1 py-2 text-sm">
                {busy ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              For {event.recipient_name} · status <b>{event.event_status}</b>
            </p>
            <div>
              <label className="text-xs font-medium block mb-1">New unlock date</label>
              <input type="date" className="bday-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">New unlock time</label>
              <input type="time" className="bday-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Time zone</label>
              <select className="bday-input" value={tz} onChange={(e) => setTz(e.target.value)}>
                {!zones.includes(tz) && <option value={tz}>{tz}</option>}
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Reason (optional)</label>
              <input
                className="bday-input"
                value={reason}
                maxLength={200}
                placeholder="e.g. party moved to Saturday"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Stored in UTC as {preview ? preview.toISOString() : "—"}
            </p>

            {logs && logs.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Change history ({logs.length})</summary>
                <ul className="mt-2 space-y-1">
                  {logs.map((l) => (
                    <li key={l.id} className="text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()} —{" "}
                      {l.old_unlock_time ? new Date(l.old_unlock_time).toLocaleString() : "?"} →{" "}
                      {new Date(l.new_unlock_time).toLocaleString()} ({l.timezone}, {l.device}/{l.browser})
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border rounded-md py-2 text-sm">Cancel</button>
              <button
                onClick={() => setConfirming(true)}
                disabled={!preview}
                className="bday-btn flex-1 py-2 text-sm"
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
