"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newId } from "@/lib/utils/id";
import type { PriceRow } from "@/lib/validation/catalog";

type PriceRowsEditorProps = {
  rows: PriceRow[];
  onChange: (rows: PriceRow[]) => void;
  /** Errors from the validator, e.g. { "options.1.name": "…" }. */
  errors: Record<string, string>;
  /** "options" or "sizes": the first part of the error keys for these rows. */
  field: string;
  /** What one row is called: "Option", "Size". */
  rowLabel: string;
  namePlaceholder: string;
  pricePlaceholder: string;
  /**
   * Price a new row starts with. "0" for options (most are free, like "No onion"),
   * "" for sizes (every size needs a real price, so the cook must type one).
   */
  newRowPrice?: string;
};

/**
 * An editable list of name + price rows: sizes ("Half" ₹180) or options
 * ("Hot" +₹0). Add a row, type in it, remove it with the bin.
 * Each input has its own label for screen readers ("Size 2 name").
 */
export function PriceRowsEditor({
  rows,
  onChange,
  errors,
  field,
  rowLabel,
  namePlaceholder,
  pricePlaceholder,
  newRowPrice = "",
}: PriceRowsEditorProps) {
  // The row just added gets the cursor, so you can type straight away.
  const [focusKey, setFocusKey] = useState<string>();

  function updateRow(key: string, change: Partial<PriceRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  function addRow() {
    const key = newId("row");
    setFocusKey(key);
    onChange([...rows, { key, name: "", price: newRowPrice }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const nameError = errors[`${field}.${index}.name`];
        const priceError = errors[`${field}.${index}.price`];
        return (
          <div key={row.key} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <Input
                aria-label={`${rowLabel} ${index + 1} name`}
                aria-invalid={nameError ? true : undefined}
                value={row.name}
                onChange={(e) => updateRow(row.key, { name: e.target.value })}
                placeholder={namePlaceholder}
                autoFocus={row.key === focusKey}
                autoComplete="off"
                className="flex-1"
              />
              <div className="relative w-32 shrink-0">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
                <Input
                  aria-label={`${rowLabel} ${index + 1} price in rupees`}
                  aria-invalid={priceError ? true : undefined}
                  value={row.price}
                  onChange={(e) => updateRow(row.key, { price: e.target.value })}
                  placeholder={pricePlaceholder}
                  inputMode="decimal"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                aria-label={`Remove ${row.name.trim() || `${rowLabel.toLowerCase()} ${index + 1}`}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {(nameError ?? priceError) && (
              <p role="alert" className="text-sm font-medium text-danger">
                {nameError ?? priceError}
              </p>
            )}
          </div>
        );
      })}
      {errors[field] && (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors[field]}
        </p>
      )}
      <Button variant="secondary" size="sm" onClick={addRow} className="self-start">
        <Plus aria-hidden="true" /> Add {rowLabel.toLowerCase()}
      </Button>
    </div>
  );
}
