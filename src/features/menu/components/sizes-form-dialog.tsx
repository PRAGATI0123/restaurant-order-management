"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select";
import { validateSizes, type PriceRow } from "@/lib/validation/catalog";
import { useMenuStore } from "@/stores/menu-store";
import type { Id } from "@/types/common";
import { fromRows, toRows } from "../rows";
import { PriceRowsEditor } from "./price-rows-editor";

type SizesFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The dish to edit; undefined = choose a dish that has no sizes yet. */
  dishId?: Id;
};

const STARTER_ROWS: PriceRow[] = [
  { key: "new-half", name: "Half", price: "" },
  { key: "new-full", name: "Full", price: "" },
];

/** Set the sizes of one dish. Given a new `key` each time it opens. */
export function SizesFormDialog({ open, onClose, dishId }: SizesFormDialogProps) {
  const items = useMenuStore((s) => s.items);
  const setSizes = useMenuStore((s) => s.setSizes);
  const editing = items.find((item) => item.id === dishId);

  const [chosenDishId, setChosenDishId] = useState<Id>(dishId ?? "");
  const [rows, setRows] = useState<PriceRow[]>(() =>
    editing ? toRows(editing.variants) : STARTER_ROWS,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dishesWithoutSizes = items.filter((item) => item.variants.length === 0);
  const dish = items.find((item) => item.id === chosenDishId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dish) {
      setErrors({ dish: "Choose a dish." });
      return;
    }
    const result = validateSizes(rows);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSizes(dish.id, fromRows(result.data.sizes));
    toast.success(
      result.data.sizes.length > 0
        ? `Sizes saved for ${dish.name}`
        : `${dish.name} is now sold in one size`,
    );
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Sizes for ${editing.name}` : "Add sizes to a dish"}
      description="Guests must pick one size. Each size has its own price."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {!editing && (
          <SelectField
            label="Dish"
            value={chosenDishId}
            onChange={(e) => {
              setChosenDishId(e.target.value);
              setErrors({});
            }}
            error={errors.dish}
          >
            <option value="" disabled>
              Choose a dish
            </option>
            {dishesWithoutSizes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
        )}

        <PriceRowsEditor
          rows={rows}
          onChange={(next) => {
            setRows(next);
            setErrors({});
          }}
          errors={errors}
          field="sizes"
          rowLabel="Size"
          namePlaceholder="e.g. Half"
          pricePlaceholder="0"
        />

        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save sizes</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
