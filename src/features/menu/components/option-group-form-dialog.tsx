"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { dishesUsing } from "@/domain/menu/catalog-rules";
import {
  validateOptionGroup,
  type OptionGroupFormValues,
} from "@/lib/validation/catalog";
import { useMenuStore } from "@/stores/menu-store";
import type { ModifierGroup } from "@/types/menu";
import { fromRows, toRows } from "../rows";
import { DishPicker } from "./dish-picker";
import { PriceRowsEditor } from "./price-rows-editor";

type OptionGroupFormDialogProps = {
  open: boolean;
  onClose: () => void;
  group?: ModifierGroup;
};

/** Create or edit a shared option group ("Spice level"), and which dishes ask it. */
export function OptionGroupFormDialog({
  open,
  onClose,
  group,
}: OptionGroupFormDialogProps) {
  const items = useMenuStore((s) => s.items);
  const groups = useMenuStore((s) => s.modifierGroups);
  const saveOptionGroup = useMenuStore((s) => s.saveOptionGroup);

  const [values, setValues] = useState<OptionGroupFormValues>(() => ({
    name: group?.name ?? "",
    required: group ? group.minSelect > 0 : true,
    maxSelect: group?.maxSelect ?? 1,
    options: group
      ? toRows(group.options)
      : [
          { key: "new-1", name: "", price: "0" },
          { key: "new-2", name: "", price: "0" },
        ],
    dishIds: group
      ? dishesUsing(items, "modifierGroupIds", group.id).map((item) => item.id)
      : [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof OptionGroupFormValues>(
    field: K,
    value: OptionGroupFormValues[K],
  ) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      // Removing options can make "up to 3" impossible; keep it within range.
      next.maxSelect = Math.min(next.maxSelect, Math.max(next.options.length, 1));
      return next;
    });
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateOptionGroup(values, groups, group?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { name, required, maxSelect, options, dishIds } = result.data;
    saveOptionGroup(
      { name, required, maxSelect, options: fromRows(options), dishIds },
      group?.id,
    );
    toast.success(group ? "Option group saved" : `${name} created`, {
      description: `Asked on ${dishIds.length} ${dishIds.length === 1 ? "dish" : "dishes"}`,
    });
    onClose();
  }

  const choiceCounts = Array.from(
    { length: Math.max(values.options.length, 1) },
    (_, i) => String(i + 1),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={group ? `Edit ${group.name}` : "New option group"}
      description="A question the kitchen needs answered, like Spice level."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Group name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          placeholder="e.g. Spice level"
          autoComplete="off"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Options</span>
          <PriceRowsEditor
            rows={values.options}
            onChange={(options) => update("options", options)}
            errors={errors}
            field="options"
            rowLabel="Option"
            namePlaceholder="e.g. Hot"
            pricePlaceholder="0"
            newRowPrice="0"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-1">
          <span>
            <span className="block font-semibold">Guest must choose</span>
            <span className="block text-sm text-muted-foreground">
              Off = the guest can skip it
            </span>
          </span>
          <Switch
            checked={values.required}
            onCheckedChange={(required) => update("required", required)}
            label="Guest must choose"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold" aria-hidden="true">
            Guest can pick up to
          </span>
          <ChipGroup
            label="Guest can pick up to"
            value={String(values.maxSelect)}
            onChange={(count) => update("maxSelect", Number(count))}
            options={choiceCounts.map((count) => ({ value: count, label: count }))}
          />
          {errors.maxSelect && (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.maxSelect}
            </p>
          )}
        </div>

        <DishPicker
          legend="Asked on these dishes"
          value={values.dishIds}
          onChange={(dishIds) => update("dishIds", dishIds)}
        />

        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{group ? "Save group" : "Create group"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
