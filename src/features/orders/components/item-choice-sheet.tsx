"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { BottomSheet } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import {
  addOnsFor,
  buildOrderItem,
  findChoiceProblems,
  groupsFor,
  unitPriceWithChoices,
  type ItemChoices,
} from "@/domain/orders/item-choices";
import { formatPrice, formatRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import { newId } from "@/lib/utils/id";
import { tryAction } from "@/lib/utils/try-action";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuItem, ModifierGroup } from "@/types/menu";
import type { OrderItem } from "@/types/order";

type ItemChoiceSheetProps = {
  item: MenuItem | undefined;
  onClose: () => void;
  /** Where the dish goes. Default: the cart. (The order page adds straight to an order.) */
  onAdd?: (line: OrderItem) => void;
};

/** The sheet that asks "which size? spice level? any extras?" before adding a dish. */
export function ItemChoiceSheet({ item, onClose, onAdd }: ItemChoiceSheetProps) {
  return (
    <BottomSheet
      open={item !== undefined}
      onClose={onClose}
      title={item?.name ?? "Dish"}
      description="Choose how the guest wants it."
    >
      {/* key: fresh choices every time a dish is opened */}
      {item && <ChoiceForm key={item.id} item={item} onDone={onClose} onAdd={onAdd} />}
    </BottomSheet>
  );
}

function ChoiceForm({
  item,
  onDone,
  onAdd,
}: {
  item: MenuItem;
  onDone: () => void;
  onAdd?: (line: OrderItem) => void;
}) {
  const addOns = useMenuStore((s) => s.addOns);
  const modifierGroups = useMenuStore((s) => s.modifierGroups);
  const addLine = useCartStore((s) => s.addLine);
  const catalog = { addOns, modifierGroups };

  const [choices, setChoices] = useState<ItemChoices>({
    addOnIds: [],
    optionIds: {},
    quantity: 1,
    note: "",
  });

  const problems = findChoiceProblems(item, choices, catalog);
  const firstProblem = Object.values(problems)[0];
  const unitPrice = unitPriceWithChoices(item, choices, catalog);
  // A dish with sizes has no price until a size is picked (the card says "from ₹180").
  const priceKnown = item.variants.length === 0 || choices.variantId !== undefined;

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function setGroup(group: ModifierGroup, optionIds: string[]) {
    setChoices((c) => ({ ...c, optionIds: { ...c.optionIds, [group.id]: optionIds } }));
  }

  function add() {
    const added = tryAction(() =>
      (onAdd ?? addLine)(buildOrderItem(item, choices, catalog, newId("line"))),
    );
    if (added) {
      toast.success(`${choices.quantity} × ${item.name} added`);
      onDone();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {item.variants.length > 0 && (
        <ChoiceSection title="Size" note="Required">
          <ChipGroup
            label="Size"
            value={choices.variantId ?? ""}
            onChange={(variantId) => setChoices((c) => ({ ...c, variantId }))}
            options={item.variants.map((v) => ({
              value: v.id,
              label: `${v.name} · ${formatPrice(v.pricePaise)}`,
            }))}
          />
        </ChoiceSection>
      )}

      {groupsFor(item, catalog).map((group) => {
        const chosen = choices.optionIds[group.id] ?? [];
        const rule =
          group.minSelect > 0
            ? group.maxSelect === 1
              ? "Required"
              : `Required · up to ${group.maxSelect}`
            : group.maxSelect === 1
              ? "Optional"
              : `Optional · up to ${group.maxSelect}`;
        const label = (o: { name: string; pricePaise: number }) =>
          o.pricePaise > 0 ? `${o.name} +${formatPrice(o.pricePaise)}` : o.name;

        return (
          <ChoiceSection key={group.id} title={group.name} note={rule}>
            {group.maxSelect === 1 ? (
              // Pick one: radio chips. Optional groups get a "None" chip.
              <ChipGroup
                label={group.name}
                value={chosen[0] ?? "none"}
                onChange={(id) => setGroup(group, id === "none" ? [] : [id])}
                options={[
                  ...(group.minSelect === 0 ? [{ value: "none", label: "None" }] : []),
                  ...group.options.map((o) => ({ value: o.id, label: label(o) })),
                ]}
              />
            ) : (
              // Pick several: toggle chips; the rest grey out once the limit is reached.
              <ToggleChips
                label={group.name}
                options={group.options.map((o) => ({ id: o.id, label: label(o) }))}
                chosen={chosen}
                limit={group.maxSelect}
                onToggle={(id) => setGroup(group, toggle(chosen, id))}
              />
            )}
          </ChoiceSection>
        );
      })}

      {addOnsFor(item, catalog).length > 0 && (
        <ChoiceSection title="Extras" note="Optional">
          <ToggleChips
            label="Extras"
            options={addOnsFor(item, catalog).map((a) => ({
              id: a.id,
              label: `${a.name} +${formatPrice(a.pricePaise)}`,
            }))}
            chosen={choices.addOnIds}
            onToggle={(id) =>
              setChoices((c) => ({ ...c, addOnIds: toggle(c.addOnIds, id) }))
            }
          />
        </ChoiceSection>
      )}

      <Field
        label="Kitchen note"
        value={choices.note ?? ""}
        onChange={(e) => setChoices((c) => ({ ...c, note: e.target.value }))}
        placeholder="e.g. less oil"
        maxLength={80}
        autoComplete="off"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <QuantityStepper
          label={item.name}
          size="lg"
          value={choices.quantity}
          onChange={(quantity) => setChoices((c) => ({ ...c, quantity }))}
        />
        <div className="flex flex-col items-end gap-1">
          {firstProblem && (
            <p className="text-sm font-medium text-danger" role="status">
              {firstProblem}
            </p>
          )}
          <Button size="lg" disabled={firstProblem !== undefined} onClick={add}>
            Add to order
            {priceKnown && ` · ${formatRupees(unitPrice * choices.quantity)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChoiceSection({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </p>
      {children}
    </div>
  );
}

/** Chips that can each be on or off, with an optional limit ("up to 2"). */
function ToggleChips({
  label,
  options,
  chosen,
  limit,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  chosen: string[];
  limit?: number;
  onToggle: (id: string) => void;
}) {
  const full = limit !== undefined && chosen.length >= limit;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const on = chosen.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            disabled={!on && full}
            onClick={() => onToggle(option.id)}
            className={cn(
              "flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-40",
              on
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {on && <Check className="size-4" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
