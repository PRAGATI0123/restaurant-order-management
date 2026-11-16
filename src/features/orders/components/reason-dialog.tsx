"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type ReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** One-tap reasons, so staff rarely need to type. */
  quickReasons: string[];
};

/**
 * Asks WHY before something is cancelled. The reason is saved with the order,
 * so the manager can see later why money was lost. One tap on a common reason,
 * or type your own.
 */
export function ReasonDialog(props: ReasonDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
    >
      {/* Only rendered while open, so the reason starts empty every time */}
      {props.open && <ReasonForm {...props} />}
    </Dialog>
  );
}

function ReasonForm({
  onClose,
  onConfirm,
  confirmLabel,
  quickReasons,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (reason.trim().length < 3) {
          setError("Give a short reason (at least 3 letters).");
          return;
        }
        onConfirm(reason.trim());
        onClose();
      }}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Common reasons">
        {quickReasons.map((quick) => (
          <button
            key={quick}
            type="button"
            aria-pressed={reason === quick}
            onClick={() => {
              setReason(quick);
              setError(undefined);
            }}
            className={cn(
              "h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
              reason === quick
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {quick}
          </button>
        ))}
      </div>
      <Field
        label="Reason"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(undefined);
        }}
        error={error}
        maxLength={80}
        autoComplete="off"
      />
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Keep it
        </Button>
        <Button type="submit" variant="danger">
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
