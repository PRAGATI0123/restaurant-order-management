"use client";

import { ArrowRight, Check, ChefHat, Clock, Info, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  elapsedSeconds,
  formatElapsed,
  ticketUrgency,
  type TicketUrgency,
} from "@/domain/kitchen/delay-rules";
import {
  ticketClockStart,
  type KitchenColumn,
  type KitchenTicket as KitchenTicketOrder,
} from "@/domain/kitchen/kitchen-board";
import { cn } from "@/lib/utils/cn";
import { ORDER_TYPE_LABEL } from "@/features/orders/order-display";
import { useSettingsStore } from "@/stores/settings-store";
import { useCan } from "@/features/auth/hooks";

/** The one big button on each ticket: what the cook is DOING next. */
const NEXT_ACTION: Record<
  KitchenColumn,
  { label: string; icon: typeof Check; variant: "primary" | "secondary" }
> = {
  new: { label: "Start cooking", icon: ChefHat, variant: "primary" },
  preparing: { label: "Mark ready", icon: Check, variant: "primary" },
  ready: { label: "Mark served", icon: ArrowRight, variant: "secondary" },
};

/** Colors AND words for each level, so it doesn't depend on color alone. */
const URGENCY_STYLE: Record<
  TicketUrgency,
  { card: string; timer: string; label?: string }
> = {
  "on-time": { card: "border-border", timer: "bg-surface-muted text-foreground" },
  warning: {
    card: "border-accent",
    timer: "bg-accent text-accent-foreground",
    label: "Getting late",
  },
  late: {
    card: "border-danger",
    timer: "bg-danger text-danger-foreground",
    label: "Late",
  },
};

type KitchenTicketProps = {
  order: KitchenTicketOrder;
  /** "T2", "Rohan", "Arjun Mehta" */
  where: string;
  /** From useNow(1000); null for the very first draw (no timer yet). */
  now: number | null;
  onAdvance: (order: KitchenTicketOrder) => void;
};

/**
 * ONE KITCHEN TICKET
 * Big and simple, made to be read from a step away and tapped with a wet hand:
 * order number, where it goes, a live timer, every dish with its choices and
 * notes, and one large button that moves it on.
 */
export function KitchenTicket({ order, where, now, onAdvance }: KitchenTicketProps) {
  const can = useCan(); // hide what this role can't do (the store checks again)
  const timing = useSettingsStore((s) => s.kitchenTiming); // amber / red minutes, from Settings
  const cooking = order.status !== "ready";
  const seconds =
    now === null ? undefined : elapsedSeconds(ticketClockStart(order), new Date(now));
  // Only tickets still being cooked can be late. Ready food has its own clock.
  const urgency: TicketUrgency =
    cooking && seconds !== undefined ? ticketUrgency(seconds, timing) : "on-time";
  const style = URGENCY_STYLE[urgency];
  const justIn = order.status === "new" && seconds !== undefined && seconds < 60;
  const action = NEXT_ACTION[order.status];
  const titleId = `ticket-${order.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-2 bg-surface p-4 shadow-sm",
        style.card,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        {/* Number on top, where it goes underneath: never squeezed by the timer. */}
        <h3 id={titleId} className="min-w-0 font-display font-semibold">
          <span className="block text-2xl leading-none">#{order.number}</span>
          <span className="mt-1 block truncate text-lg text-muted-foreground">
            {where}
          </span>
        </h3>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold tabular-nums",
              style.timer,
            )}
            // The timer changes every second: no screen-reader announcements for it.
            aria-label={
              seconds === undefined
                ? undefined
                : `${cooking ? "Waiting" : "Ready for"} ${Math.floor(seconds / 60)} minutes`
            }
          >
            <Clock className="size-4" aria-hidden="true" />
            {seconds === undefined ? "–:––" : formatElapsed(seconds)}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {cooking ? (style.label ?? "Since order") : "At the pass"}
          </span>
        </div>
      </header>

      <div className="-mt-1 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{ORDER_TYPE_LABEL[order.type]}</Badge>
        {justIn && <Badge variant="primary">Just in</Badge>}
        {order.splitFromNumber && (
          <Badge variant="neutral">Split from #{order.splitFromNumber}</Badge>
        )}
        {can("orders.view") && (
          <ButtonLink
            href={`/orders/${order.id}`}
            variant="ghost"
            size="sm"
            className="-my-2 ml-auto px-2 text-muted-foreground"
            aria-label={`Order ${order.number} details`}
          >
            <Info aria-hidden="true" /> Details
          </ButtonLink>
        )}
      </div>

      <ul className="flex flex-col gap-2 border-t border-dashed border-border pt-3">
        {order.items.map((line) => {
          const cancelled = line.status === "cancelled";
          const choices = [
            line.variant?.name,
            ...line.modifiers.map((m) => m.name),
            ...line.addOns.map((a) => `+ ${a.name}`),
          ].filter(Boolean);
          return (
            <li key={line.id} className={cn(cancelled && "text-muted-foreground")}>
              <p className="flex gap-2 text-lg leading-snug">
                <span className="w-8 shrink-0 font-bold tabular-nums">
                  {line.quantity}×
                </span>
                <span className={cn("font-semibold", cancelled && "line-through")}>
                  {line.name}
                </span>
                {cancelled && (
                  <Badge variant="danger" className="ml-auto self-center">
                    Cancelled
                  </Badge>
                )}
              </p>
              {choices.length > 0 && (
                <p className="pl-10 text-sm text-muted-foreground">
                  {choices.join(" · ")}
                </p>
              )}
              {line.note && !cancelled && (
                <p className="mt-1 ml-10 flex items-start gap-1.5 rounded-lg bg-accent/20 px-2 py-1 text-sm font-semibold">
                  <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Note: </span>
                    {line.note}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Cooks start and finish; serving is front of house (a waiter's tap). */}
      {can(order.status === "ready" ? "order.serve" : "kitchen.updateStatus") ? (
        <Button
          variant={action.variant}
          size="lg"
          fullWidth
          className="mt-auto px-3"
          onClick={() => onAdvance(order)}
          aria-label={`${action.label}: order ${order.number}`}
        >
          <action.icon aria-hidden="true" /> {action.label}
        </Button>
      ) : (
        <p className="mt-auto rounded-xl bg-surface-muted px-3 py-3 text-center text-sm font-semibold text-muted-foreground">
          {order.status === "ready"
            ? "Waiting for a waiter to pick up"
            : "Waiting for the kitchen"}
        </p>
      )}
    </article>
  );
}
