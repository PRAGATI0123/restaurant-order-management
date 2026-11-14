"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { validateCategory } from "@/lib/validation/catalog";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuCategory } from "@/types/menu";

type CategoryFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The category to rename, or undefined to add a new one. */
  category?: MenuCategory;
};

/** Add or rename a category. Given a new `key` each time it opens, so it starts fresh. */
export function CategoryFormDialog({ open, onClose, category }: CategoryFormDialogProps) {
  const categories = useMenuStore((s) => s.categories);
  const addCategory = useMenuStore((s) => s.addCategory);
  const renameCategory = useMenuStore((s) => s.renameCategory);
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateCategory({ name }, categories, category?.id);
    if (!result.ok) {
      setError(result.errors.name);
      return;
    }
    if (category) {
      renameCategory(category.id, result.data.name);
      toast.success(`Renamed to ${result.data.name}`);
    } else {
      addCategory(result.data.name);
      toast.success(`${result.data.name} added`, {
        description: "It's at the end of the menu. Move it up if you like.",
      });
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={category ? `Rename ${category.name}` : "Add category"}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Category name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          error={error}
          placeholder="e.g. Chef's Specials"
          autoComplete="off"
        />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{category ? "Save" : "Add category"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
