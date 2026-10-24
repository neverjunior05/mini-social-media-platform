"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useUiStore, toast } from "@/store/useUiStore";
import { REPORT_REASONS } from "@/config/site";
import { api } from "@/lib/client";

/** Global report sheet. Opened from any post/comment/user/message menu via useUiStore.setReportTarget. */
export function ReportDialog() {
  const target = useUiStore((s) => s.reportTarget);
  const setTarget = useUiStore((s) => s.setReportTarget);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => {
    setTarget(null);
    setReason("");
    setDetails("");
  };
  const submit = async () => {
    if (!target || !reason) return;
    setBusy(true);
    try {
      await api("/api/reports", { method: "POST", json: { targetType: target.type, targetId: target.id, reason, details } });
      toast({ title: "Thanks — our moderators will take a look.", kind: "success" });
      close();
    } catch (e) {
      toast({ title: (e as Error).message, kind: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!target} onClose={close} title={`Report ${target?.type ?? ""}`} size="sm">
      <p className="mb-3 text-sm text-muted">Reports are private. Tell us what's going on and a human moderator will review it.</p>
      <div className="space-y-2" role="radiogroup" aria-label="Reason">
        {REPORT_REASONS.map((r) => (
          <label key={r} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${reason === r ? "border-coral bg-coral/10" : "border-hairline"}`}>
            <input type="radio" name="reason" className="accent-coral" checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
      </div>
      <textarea className="input mt-3 min-h-20" placeholder="Anything else that helps (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={close}>Cancel</button>
        <button className="btn-primary" disabled={!reason || busy} onClick={submit}>{busy ? "Sending…" : "Send report"}</button>
      </div>
    </Modal>
  );
}
