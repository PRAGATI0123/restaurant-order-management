"use client";

import { Banknote, CreditCard, QrCode, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/ui/num-pad";
import { DomainError } from "@/domain/errors";
import {
  PAYMENT_METHOD_LABEL,
  amountDue,
  checkPayment,
  nextEqualShare,
  quickCashAmounts,
  type CheckedPayment,
  type PaymentDraft,
} from "@/domain/billing/payments";
import { formatRupees, paiseToText, parseRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import type { Paise } from "@/types/common";
import type { PaymentMethod } from "@/types/payment";

const METHODS: { value: PaymentMethod; icon: typeof Banknote }[] = [
  { value: "cash", icon: Banknote },
  { value: "card", icon: CreditCard },
  { value: "upi", icon: QrCode },
];
const SPLIT_OPTIONS = [2, 3, 4, 5, 6];

type PaymentPanelProps = {
  totalPaise: Paise;
  /** Parts already added (a split payment), not saved yet. */
  parts: PaymentDraft[];
  onAddPart: (part: PaymentDraft) => void;
  onRemovePart: (index: number) => void;
  /** Called with ALL parts when they cover the bill exactly. */
  onFinish: (parts: PaymentDraft[]) => void;
};

/** Reads typed rupees; undefined if it isn't a valid amount yet. */
function readRupees(text: string): Paise | undefined {
  try {
    return parseRupees(text);
  } catch {
    return undefined;
  }
}

/**
 * TAKING THE MONEY
 *
 *  - Pick how the guest pays: Cash, Card or UPI (card and UPI are simulated).
 *  - "Amount to pay" starts at what's still due. Change it to take part of
 *    the bill (split payment), or tap "Split equally" to fill in each guest's
 *    share. The shares always add up to the total exactly.
 *  - Cash: type what the guest handed over (or tap a quick note amount) and
 *    the change is shown right away.
 *  - The big button finishes the bill in one tap when the amount covers what's
 *    due; otherwise it adds a part and waits for the next guest.
 *
 * The number pad types into whichever field was tapped last.
 */
export function PaymentPanel({
  totalPaise,
  parts,
  onAddPart,
  onRemovePart,
  onFinish,
}: PaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [guests, setGuests] = useState<number>();
  // null = not typed: the amount follows what's due (or the guest's share).
  const [amountText, setAmountText] = useState<string | null>(null);
  const [receivedText, setReceivedText] = useState("");
  const [active, setActive] = useState<"amount" | "received">("amount");

  const due = amountDue(totalPaise, parts);
  const suggested = guests ? nextEqualShare(totalPaise, guests, parts.length, due) : due;
  const shownAmount = amountText ?? paiseToText(suggested);
  const amountPaise = readRupees(shownAmount);
  const receivedPaise = receivedText === "" ? undefined : readRupees(receivedText);

  let checked: CheckedPayment | undefined;
  let problem: string | undefined;
  if (amountPaise === undefined) {
    problem = "Enter the amount to pay, like 450 or 450.50.";
  } else if (method === "cash" && receivedText !== "" && receivedPaise === undefined) {
    problem = "Enter the cash received, like 500.";
  } else {
    try {
      checked = checkPayment(
        {
          method,
          amountPaise,
          ...(method === "cash" ? { tenderedPaise: receivedPaise } : {}),
        },
        due,
      );
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      problem = e.message;
    }
  }
  const finishes = checked !== undefined && checked.amountPaise === due;

  function resetEntry() {
    setAmountText(null);
    setReceivedText("");
    setActive("amount");
  }

  function submit() {
    if (!checked) return;
    const part: PaymentDraft = {
      method: checked.method,
      amountPaise: checked.amountPaise,
      ...(checked.tenderedPaise !== undefined
        ? { tenderedPaise: checked.tenderedPaise }
        : {}),
    };
    if (finishes) {
      onFinish([...parts, part]);
    } else {
      onAddPart(part);
      resetEntry();
    }
  }

  const fieldClass = (field: "amount" | "received") =>
    cn(
      "h-14 w-full rounded-xl border-2 bg-surface px-4 text-right text-2xl font-semibold tabular-nums outline-none",
      active === field ? "border-primary" : "border-border",
    );

  // A free bill (100% discount): nothing to take, just close it.
  if (totalPaise === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          This bill is fully discounted. Nothing to pay.
        </p>
        <Button size="lg" fullWidth onClick={() => onFinish([])}>
          Close the bill
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">
          {parts.length > 0 ? "Still to pay" : "To pay"}
        </span>
        <span
          className="font-display text-3xl font-semibold tabular-nums"
          aria-live="polite"
        >
          {formatRupees(due)}
        </span>
      </div>

      {parts.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Payments added">
          {parts.map((part, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-xl bg-surface-muted py-1 pr-1 pl-3"
            >
              <span className="flex-1 text-sm">
                <span className="font-semibold">{PAYMENT_METHOD_LABEL[part.method]}</span>{" "}
                <span className="tabular-nums">{formatRupees(part.amountPaise)}</span>
                {part.tenderedPaise !== undefined &&
                  part.tenderedPaise > part.amountPaise && (
                    <span className="text-muted-foreground">
                      {" "}
                      · change {formatRupees(part.tenderedPaise - part.amountPaise)}
                    </span>
                  )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => onRemovePart(index)}
                aria-label={`Remove ${PAYMENT_METHOD_LABEL[part.method]} payment of ${formatRupees(part.amountPaise)}`}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* How the guest pays */}
      <div
        role="radiogroup"
        aria-label="Payment method"
        className="grid grid-cols-3 gap-2"
      >
        {METHODS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            onClick={() => {
              setMethod(value);
              setActive("amount");
            }}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 font-semibold transition-colors",
              method === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:bg-surface-muted",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {PAYMENT_METHOD_LABEL[value]}
          </button>
        ))}
      </div>

      {/* Split equally */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Split equally"
      >
        <span className="text-sm text-muted-foreground">Split equally:</span>
        {SPLIT_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={guests === n}
            onClick={() => {
              setGuests(guests === n ? undefined : n);
              setAmountText(null);
            }}
            className={cn(
              "size-11 rounded-full border font-semibold tabular-nums",
              guests === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:bg-surface-muted",
            )}
            aria-label={`Split between ${n} guests`}
          >
            {n}
          </button>
        ))}
      </div>
      {guests && parts.length < guests && (
        <p className="-mt-2 text-sm text-muted-foreground">
          Guest {parts.length + 1} of {guests} pays their share.
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Amount to pay (₹)</span>
        <input
          className={fieldClass("amount")}
          value={shownAmount}
          inputMode="decimal"
          autoComplete="off"
          onFocus={(e) => {
            setActive("amount");
            e.target.select();
          }}
          onChange={(e) => setAmountText(e.target.value)}
        />
      </label>

      {method === "cash" && (
        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Cash received (₹)</span>
            <input
              className={fieldClass("received")}
              value={receivedText}
              placeholder="Exact amount"
              inputMode="decimal"
              autoComplete="off"
              onFocus={() => setActive("received")}
              onChange={(e) => setReceivedText(e.target.value)}
            />
          </label>
          {amountPaise !== undefined && amountPaise > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Quick cash amounts"
            >
              {quickCashAmounts(amountPaise).map((cash) => (
                <button
                  key={cash}
                  type="button"
                  onClick={() => {
                    setReceivedText(paiseToText(cash));
                    setActive("received");
                  }}
                  className="h-11 rounded-xl border border-border bg-surface px-3 font-semibold tabular-nums hover:bg-surface-muted"
                >
                  {formatRupees(cash)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <NumPad
        label={active === "amount" ? "Amount to pay" : "Cash received"}
        allowDecimal
        // While the amount isn't typed yet, the first key starts a new number.
        value={active === "amount" ? (amountText ?? "") : receivedText}
        onChange={(next) =>
          active === "amount" ? setAmountText(next) : setReceivedText(next)
        }
      />

      <div aria-live="polite" className="min-h-6 text-sm">
        {problem ? (
          <p className="text-danger">{problem}</p>
        ) : checked?.changePaise ? (
          <p className="text-lg font-semibold">
            Change to give:{" "}
            <span className="tabular-nums">{formatRupees(checked.changePaise)}</span>
          </p>
        ) : method !== "cash" ? (
          <p className="text-muted-foreground">
            Simulated {PAYMENT_METHOD_LABEL[method]} payment. No real money moves.
          </p>
        ) : null}
      </div>

      <Button size="lg" fullWidth disabled={!checked} onClick={submit}>
        {checked === undefined
          ? "Take payment"
          : finishes
            ? `Take ${formatRupees(checked.amountPaise)} and finish`
            : `Add ${PAYMENT_METHOD_LABEL[checked.method]} part: ${formatRupees(checked.amountPaise)}`}
      </Button>
    </div>
  );
}
