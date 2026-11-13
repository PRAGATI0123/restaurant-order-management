"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { paiseToText } from "@/domain/money";
import {
  validateMenuItemForm,
  type FormErrors,
  type MenuItemFormValues,
} from "@/lib/validation/menu-item";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuItem } from "@/types/menu";

type MenuItemFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The item to edit, or undefined to add a new one. */
  item?: MenuItem;
  /** Called after a successful save, with the saved item. */
  onSaved: (item: MenuItem) => void;
};

/**
 * Add or edit a menu item. The parent gives this component a new `key` each
 * time it opens, so the fields always start fresh from `item` (or empty).
 */
export function MenuItemFormDialog({
  open,
  onClose,
  item,
  onSaved,
}: MenuItemFormDialogProps) {
  const categories = useMenuStore((s) => s.categories);
  const items = useMenuStore((s) => s.items);
  const addItem = useMenuStore((s) => s.addItem);
  const updateItem = useMenuStore((s) => s.updateItem);

  const [values, setValues] = useState<MenuItemFormValues>(() => ({
    name: item?.name ?? "",
    categoryId: item?.categoryId ?? "",
    price: item ? paiseToText(item.pricePaise) : "",
    isVeg: item?.isVeg ?? true,
    isAvailable: item?.isAvailable ?? true,
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  /** Change one field, and clear its error so the user sees their fix worked. */
  function update<K extends keyof MenuItemFormValues>(
    field: K,
    value: MenuItemFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateMenuItemForm(values, items, item?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { price, ...rest } = result.data;
    const details = { ...rest, pricePaise: price };

    if (item) {
      updateItem(item.id, details);
      toast.success("Changes saved", { description: details.name });
      onSaved({ ...item, ...details });
    } else {
      const created = addItem(details);
      toast.success(`${created.name} added to the menu`);
      onSaved(created);
    }
    onClose();
  }

  const hasSizes = (item?.variants.length ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? `Edit ${item.name}` : "Add menu item"}
      description={
        item ? undefined : "Sizes, add-ons and options are set on the Modifiers page."
      }
    >
      {/* noValidate: we show our own friendly messages instead of the browser's */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          placeholder="e.g. Masala Dosa"
          autoComplete="off"
        />

        <SelectField
          label="Category"
          value={values.categoryId}
          onChange={(e) => update("categoryId", e.target.value)}
          error={errors.categoryId}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>

        <Field
          label="Price (₹)"
          value={values.price}
          onChange={(e) => update("price", e.target.value)}
          error={errors.price}
          hint={
            hasSizes ? "Used only if no size is chosen." : "In rupees, e.g. 120 or 120.50"
          }
          placeholder="0"
          inputMode="decimal" // phones show the number keyboard
          autoComplete="off"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold" aria-hidden="true">
            Type
          </span>
          <ChipGroup
            label="Vegetarian or non-vegetarian"
            value={values.isVeg ? "veg" : "non-veg"}
            onChange={(diet) => update("isVeg", diet === "veg")}
            options={[
              { value: "veg", label: "Vegetarian" },
              { value: "non-veg", label: "Non-vegetarian" },
            ]}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-1">
          <span className="font-semibold">Available today</span>
          <Switch
            checked={values.isAvailable}
            onCheckedChange={(checked) => update("isAvailable", checked)}
            label="Available today"
          />
        </div>

        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{item ? "Save changes" : "Add item"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
