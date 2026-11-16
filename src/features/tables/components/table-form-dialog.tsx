"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { findFreeSpot } from "@/domain/tables/layout";
import { newId } from "@/lib/utils/id";
import { validateTable, type TableFormValues } from "@/lib/validation/table";
import type { TableLayout } from "@/stores/service-store";

type TableFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** All tables in the editor right now (for name and space checks). */
  draft: TableLayout[];
  /** The table to edit, or undefined to add a new one. */
  table?: TableLayout;
  /** Gets the finished table: placed in a free spot if it's new. */
  onSave: (table: TableLayout) => void;
};

/** Add a table, or change a table's name or seats. Every table is the same size. */
export function TableFormDialog({
  open,
  onClose,
  draft,
  table,
  onSave,
}: TableFormDialogProps) {
  const [values, setValues] = useState<TableFormValues>(() => ({
    name: table?.name ?? suggestName(draft),
    seats: String(table?.seats ?? 4),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof TableFormValues>(field: K, value: TableFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTable(values, draft, table?.id);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const { name, seats } = result.data;

    if (table) {
      onSave({ ...table, name, seats }); // same size whatever the seats, so it still fits
    } else {
      const spot = findFreeSpot(draft);
      if (!spot) {
        setErrors({ name: "The floor is full. Move or remove a table to make room." });
        return;
      }
      onSave({ id: newId("table"), name, seats, ...spot });
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={table ? `Edit ${table.name}` : "Add table"}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          autoComplete="off"
        />
        <Field
          label="Seats"
          value={values.seats}
          onChange={(e) => update("seats", e.target.value)}
          error={errors.seats}
          hint="From 1 to 12. All tables are the same size on the floor plan."
          inputMode="numeric"
          autoComplete="off"
        />
        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{table ? "Save" : "Add table"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/** Next free "T" number: T1…T11 exist → "T12". */
function suggestName(draft: TableLayout[]): string {
  const numbers = draft
    .map((t) => /^T(\d+)$/i.exec(t.name)?.[1])
    .filter(Boolean)
    .map(Number);
  return `T${Math.max(0, ...numbers) + 1}`;
}
