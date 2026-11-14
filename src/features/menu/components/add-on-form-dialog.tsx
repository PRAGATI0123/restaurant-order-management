"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { dishesUsing } from "@/domain/menu/catalog-rules";
import { paiseToText } from "@/domain/money";
import { validateAddOn, type AddOnFormValues } from "@/lib/validation/catalog";
import { useMenuStore } from "@/stores/menu-store";
import type { AddOn } from "@/types/menu";
import { DishPicker } from "./dish-picker";

type AddOnFormDialogProps = {
  open: boolean;
  onClose: () => void;
  addOn?: AddOn;
};

/** Create or edit a shared add-on, and choose which dishes offer it. */
export function AddOnFormDialog({ open, onClose, addOn }: AddOnFormDialogProps) {
  const items = useMenuStore((s) => s.items);
  const addOns = useMenuStore((s) => s.addOns);
  const saveAddOn = useMenuStore((s) => s.saveAddOn);

  const [values, setValues] = useState<AddOnFormValues>(() => ({
    name: addOn?.name ?? "",
    price: addOn ? paiseToText(addOn.pricePaise) : "",
    dishIds: addOn ? dishesUsing(items, "addOnIds", addOn.id).map((item) => item.id) : [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof AddOnFormValues>(field: K, value: AddOnFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateAddOn(values, addOns, addOn?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { name, price, dishIds } = result.data;
    saveAddOn({ name, pricePaise: price, dishIds }, addOn?.id);
    toast.success(addOn ? "Add-on saved" : `${name} created`, {
      description: `Offered on ${dishIds.length} ${dishIds.length === 1 ? "dish" : "dishes"}`,
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={addOn ? `Edit ${addOn.name}` : "New add-on"}
      description="An extra the guest can add for a price, like Extra cheese."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name || undefined}
          placeholder="e.g. Extra cheese"
          autoComplete="off"
        />
        <Field
          label="Price (₹)"
          value={values.price}
          onChange={(e) => update("price", e.target.value)}
          error={errors.price || undefined}
          placeholder="0"
          inputMode="decimal"
          autoComplete="off"
        />
        <DishPicker
          legend="Offered on these dishes"
          value={values.dishIds}
          onChange={(dishIds) => update("dishIds", dishIds)}
        />
        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{addOn ? "Save add-on" : "Create add-on"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
