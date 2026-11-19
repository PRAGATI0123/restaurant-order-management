"use client";

import {
  CloudCheck,
  CloudOff,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { BottomSheet } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { discardEntry, outboxSummary } from "@/domain/sync/outbox";
import { useNow } from "@/lib/hooks/use-now";
import { useDataReady, whenDataLoaded } from "@/lib/persistence/load-saved-data";
import { startSync, syncNow } from "@/lib/sync/sync-engine";
import { cn } from "@/lib/utils/cn";
import { clockTime } from "@/lib/utils/time";
import { useSyncStore } from "@/stores/sync-store";

type Tone = "ok" | "busy" | "offline" | "problem";

const TONE: Record<Tone, { icon: LucideIcon; className: string }> = {
  ok: { icon: CloudCheck, className: "text-success" },
  busy: { icon: LoaderCircle, className: "text-primary" },
  offline: { icon: CloudOff, className: "text-muted-foreground" },
  problem: { icon: TriangleAlert, className: "text-danger" },
};

/** One short status, worked out from the sync store. */
function useSyncStatus() {
  const outbox = useSyncStore((s) => s.outbox);
  const syncing = useSyncStore((s) => s.syncing);
  const online = useSyncStore((s) => s.browserOnline && !s.network.offline);
  const { pending, rejected } = outboxSummary(outbox);

  if (rejected > 0) {
    return {
      tone: "problem" as Tone,
      text: `${rejected} need${rejected === 1 ? "s" : ""} attention`,
    };
  }
  if (!online) {
    return {
      tone: "offline" as Tone,
      text: pending > 0 ? `Offline · ${pending} waiting` : "Offline · all saved",
    };
  }
  if (syncing || pending > 0)
    return { tone: "busy" as Tone, text: `Syncing ${pending}…` };
  return { tone: "ok" as Tone, text: "Synced" };
}

/**
 * THE SYNC BADGE in the header. Also starts the sync engine once the saved
 * data has loaded (it's on every POS page, so this always happens).
 */
export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const ready = useDataReady();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => whenDataLoaded(startSync), []);

  if (!ready) return null;
  const { icon: Icon, className } = TONE[status.tone];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sync status: ${status.text} (open details)`}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-muted",
          compact && "px-2.5",
        )}
      >
        <Icon
          className={cn(
            "size-5",
            className,
            status.tone === "busy" && "motion-safe:animate-spin",
          )}
          aria-hidden="true"
        />
        <span className={cn(compact && "sr-only")}>{status.text}</span>
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Sync"
        description="Everything is saved on this device first, so the till works without internet. Changes are sent to the restaurant's server when it's reachable."
      >
        <SyncPanel />
      </BottomSheet>
    </>
  );
}

function SyncPanel() {
  const outbox = useSyncStore((s) => s.outbox);
  const network = useSyncStore((s) => s.network);
  const setNetwork = useSyncStore((s) => s.setNetwork);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const browserOnline = useSyncStore((s) => s.browserOnline);
  const now = useNow(1000);
  const status = useSyncStatus();
  const rejected = outbox.filter((e) => e.status === "rejected");
  const waiting = outbox.filter((e) => e.status === "pending");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-semibold">{status.text}</p>
          <p className="text-sm text-muted-foreground">
            {!browserOnline && "This device has no internet. "}
            {lastSyncedAt && now !== null
              ? `Last fully synced at ${clockTime(new Date(lastSyncedAt).toISOString())}.`
              : "Not fully synced yet."}
          </p>
        </div>
        <Button variant="secondary" onClick={syncNow} disabled={outbox.length === 0}>
          <RefreshCw aria-hidden="true" /> Sync now
        </Button>
      </div>

      {rejected.length > 0 && (
        <section aria-labelledby="rejected-title" className="flex flex-col gap-2">
          <h3 id="rejected-title" className="font-semibold text-danger">
            Refused by the server
          </h3>
          <p className="text-sm text-muted-foreground">
            The server checked these and found a problem, so they aren&apos;t retried. Fix
            the record (it&apos;s sent again when it changes) or discard the change.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-danger/40">
            {rejected.map((entry) => (
              <li key={entry.key} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{entry.label}</span>
                  <span className="block text-sm text-danger">{entry.lastError}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    useSyncStore.setState((s) => ({
                      outbox: discardEntry(s.outbox, entry.key),
                    }));
                    toast(`${entry.label}: change discarded`);
                  }}
                >
                  Discard
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="waiting-title" className="flex flex-col gap-2">
        <h3 id="waiting-title" className="font-semibold">
          Waiting to send ({waiting.length})
        </h3>
        {waiting.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing waiting. All changes reached the server.
          </p>
        ) : (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {waiting.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {entry.label}
                    {entry.op === "delete" && (
                      <span className="font-normal"> (removed)</span>
                    )}
                  </span>
                  {entry.lastError && (
                    <span className="block text-muted-foreground">{entry.lastError}</span>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {entry.attempts === 0
                    ? "Queued"
                    : now !== null && entry.nextAttemptAt > now
                      ? `Retry in ${Math.ceil((entry.nextAttemptAt - now) / 1000)} s`
                      : `Try ${entry.attempts + 1}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="network-title"
        className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4"
      >
        <div>
          <h3 id="network-title" className="font-semibold">
            Network simulation (demo)
          </h3>
          <p className="text-sm text-muted-foreground">
            The server is a mock running in this browser. Use these to see how the till
            behaves on a bad connection.
          </p>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>Pretend we&apos;re offline</span>
          <Switch
            checked={network.offline}
            onCheckedChange={(offline) => setNetwork({ offline })}
            label="Pretend we're offline"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>Slow network (2.5 s per request)</span>
          <Switch
            checked={network.slow}
            onCheckedChange={(slow) => setNetwork({ slow })}
            label="Slow network"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span>Server errors</span>
          <ChipGroup
            label="Share of requests that fail"
            value={String(network.failureRate)}
            onChange={(value) => setNetwork({ failureRate: Number(value) })}
            options={[
              { value: "0", label: "None" },
              { value: "0.2", label: "1 in 5" },
              { value: "0.5", label: "1 in 2" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
