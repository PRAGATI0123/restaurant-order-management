"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils/cn";

type DialogProps = {
  /** Whether the dialog is showing. The parent owns this state. */
  open: boolean;
  /** Called whenever the dialog closes: Escape, backdrop tap, X button. */
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * A popup built on the browser's own <dialog> element. With showModal() the
 * browser gives us, for free:
 *  - focus trapped inside the dialog (Tab can't reach the page behind)
 *  - Escape closes it
 *  - the page behind can't be clicked or read by screen readers
 *  - focus goes back to the button that opened it, after closing
 *
 * React state is the boss. Every way of closing (Escape, X button, backdrop)
 * calls onClose; the parent sets open=false; the effect below then closes the
 * real <dialog>. We never close the <dialog> behind React's back (except when
 * the dialog's page is hidden or removed: see the effect's cleanup).
 *
 * Why not just listen for the browser's "close" event? It arrives later (it is
 * queued), and in testing it sometimes never arrived at all. React then still
 * thought the dialog was open and it could never be opened again. So "close"
 * is only a safety net here, for the rare case the browser closes on its own.
 */
function BaseDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  variant,
}: DialogProps & { variant: "center" | "sheet" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Keep the real <dialog> in step with the `open` prop.
  //
  // The cleanup matters: Next.js keeps the page you just left alive but hidden
  // (so Back is instant), and hiding runs this cleanup. Without it, a sheet left
  // open there (e.g. a table's "Start order" sheet) would stay a *modal* dialog
  // on the hidden page, and a modal dialog blocks clicks on everything else, so
  // the new page couldn't be used. If the page comes back, the effect runs again
  // and reopens it (if it's still meant to be open).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape key: stop the browser closing it by itself, and ask the parent instead.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Safety net: the browser closed it without asking (e.g. Escape pressed twice
      // quickly, which Chrome forces through). Only report it if we still think it's
      // open AND it really is closed right now. The "close" event can arrive late,
      // after the dialog was already reopened (e.g. for another table); reacting to
      // that stale event would wrongly close the new one.
      onClose={(event) => {
        if (open && !event.currentTarget.open) onClose();
      }}
      // A tap on the dark backdrop lands on the <dialog> itself, because the
      // content fills it via the inner <div>. A tap on content lands on a child.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "overflow-y-auto border border-border bg-surface p-0 text-foreground shadow-xl",
        "backdrop:bg-black/50",
        variant === "center" &&
          "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl motion-safe:open:animate-dialog-in",
        variant === "sheet" &&
          "mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-2xl rounded-t-3xl rounded-b-none motion-safe:open:animate-sheet-in",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-6">
        {variant === "sheet" && (
          // The grab handle: a visual hint that this panel came up from the bottom.
          <div
            className="mx-auto -mt-2 h-1.5 w-12 rounded-full bg-border"
            aria-hidden="true"
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** A centered popup: confirmations, short forms. */
export function Dialog(props: DialogProps) {
  return <BaseDialog {...props} variant="center" />;
}

/**
 * A panel that slides up from the bottom. Easier to reach with a thumb on a
 * tablet than a centered popup: item options, payment method, notes.
 */
export function BottomSheet(props: DialogProps) {
  return <BaseDialog {...props} variant="sheet" />;
}

/** The row of buttons at the bottom of a dialog. */
export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
