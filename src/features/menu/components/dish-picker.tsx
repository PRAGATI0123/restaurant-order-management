"use client";

import { sortCategories } from "@/domain/menu/catalog-rules";
import { useMenuStore } from "@/stores/menu-store";
import type { Id } from "@/types/common";

type DishPickerProps = {
  /** Ids of the ticked dishes. */
  value: Id[];
  onChange: (dishIds: Id[]) => void;
  legend: string;
};

/**
 * A ticklist of every dish, grouped by category, to choose which dishes use
 * an add-on or option group. Uses real checkboxes inside a <fieldset>, so
 * screen readers read the group name and each dish's state.
 */
export function DishPicker({ value, onChange, legend }: DishPickerProps) {
  const items = useMenuStore((s) => s.items);
  const categories = useMenuStore((s) => s.categories);
  const chosen = new Set(value);

  function toggle(dishId: Id, checked: boolean) {
    onChange(checked ? [...value, dishId] : value.filter((id) => id !== dishId));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 flex w-full items-center justify-between text-sm font-semibold">
        <span>{legend}</span>
        <span className="font-normal text-muted-foreground">{value.length} chosen</span>
      </legend>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
        {sortCategories(categories).map((category) => {
          const dishes = items.filter((item) => item.categoryId === category.id);
          if (dishes.length === 0) return null;
          return (
            <div key={category.id}>
              <p className="sticky top-0 bg-surface-muted px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {category.name}
              </p>
              {dishes.map((dish) => (
                <label
                  key={dish.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-border px-4 hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={chosen.has(dish.id)}
                    onChange={(e) => toggle(dish.id, e.target.checked)}
                    className="size-5 accent-primary"
                  />
                  <span>{dish.name}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
