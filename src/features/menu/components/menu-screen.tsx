"use client";

import { Layers, Plus, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ChipGroup } from "@/components/ui/chip-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  NO_MENU_FILTERS,
  countByCategory,
  filterMenuItems,
  type AvailabilityFilter,
  type DietFilter,
  type MenuFilters,
} from "@/domain/menu/menu-rules";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuItem } from "@/types/menu";
import { MenuItemCard } from "./menu-item-card";
import { MenuItemFormDialog } from "./menu-item-form-dialog";
import { PhotoCredits } from "./photo-credits";
import { useCan } from "@/features/auth/hooks";

/** Which form is open: none, "add", or "edit" a given item. */
type FormState = { open: false } | { open: true; item?: MenuItem };

export function MenuScreen() {
  const can = useCan(); // hide what this role can't do (the store checks again)
  // Select only what this screen needs from the store.
  const items = useMenuStore((s) => s.items);
  const categories = useMenuStore((s) => s.categories);
  const setAvailability = useMenuStore((s) => s.setAvailability);

  const [filters, setFilters] = useState<MenuFilters>(NO_MENU_FILTERS);
  const [form, setForm] = useState<FormState>({ open: false });
  // Bumped every time the form opens, so it starts with fresh fields (see the form's key).
  const [formKey, setFormKey] = useState(0);

  // useMemo: only re-filter when the items or filters actually change.
  const visible = useMemo(() => filterMenuItems(items, filters), [items, filters]);

  // Tab counts respect the other filters (search, veg…), but not the category itself.
  const counts = useMemo(
    () => countByCategory(filterMenuItems(items, { ...filters, categoryId: "all" })),
    [items, filters],
  );
  const totalForTabs = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const categoryName = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const soldOutCount = items.filter((item) => !item.isAvailable).length;
  const filtersActive =
    filters.query !== "" ||
    filters.categoryId !== "all" ||
    filters.diet !== "all" ||
    filters.availability !== "all";

  function changeFilter<K extends keyof MenuFilters>(key: K, value: MenuFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openForm(item?: MenuItem) {
    setFormKey((key) => key + 1);
    setForm({ open: true, item });
  }

  function toggleAvailable(item: MenuItem, isAvailable: boolean) {
    setAvailability(item.id, isAvailable);
    toast(
      isAvailable ? `${item.name} is available again` : `${item.name} marked sold out`,
      {
        action: { label: "Undo", onClick: () => setAvailability(item.id, !isAvailable) },
      },
    );
  }

  function handleSaved(saved: MenuItem) {
    // Make sure the item just added is on screen: show its category, clear the search.
    if (!form.open || !form.item) {
      setFilters({ ...NO_MENU_FILTERS, categoryId: saved.categoryId });
    }
  }

  return (
    <>
      <PageHeader
        title="Menu"
        description={`${items.length} ${items.length === 1 ? "dish" : "dishes"} · ${soldOutCount} sold out today`}
        actions={
          can("menu.edit") && (
            <>
              <ButtonLink href="/menu/categories" variant="secondary">
                <Layers aria-hidden="true" /> Categories
              </ButtonLink>
              <ButtonLink href="/menu/modifiers" variant="secondary">
                <SlidersHorizontal aria-hidden="true" /> Modifiers
              </ButtonLink>
              <Button onClick={() => openForm()}>
                <Plus aria-hidden="true" /> Add item
              </Button>
            </>
          )
        }
      />

      {/* Search and filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.query}
            onChange={(e) => changeFilter("query", e.target.value)}
            placeholder="Search dishes…"
            aria-label="Search dishes"
            className="pl-12"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <ChipGroup<DietFilter>
            label="Veg or non-veg"
            value={filters.diet}
            onChange={(diet) => changeFilter("diet", diet)}
            options={[
              { value: "all", label: "All" },
              { value: "veg", label: "Veg" },
              { value: "non-veg", label: "Non-veg" },
            ]}
          />
          <ChipGroup<AvailabilityFilter>
            label="Availability"
            value={filters.availability}
            onChange={(availability) => changeFilter("availability", availability)}
            options={[
              { value: "all", label: "Any" },
              { value: "available", label: "Available" },
              { value: "sold-out", label: "Sold out" },
            ]}
          />
        </div>
      </div>

      <ChipGroup
        label="Category"
        layout="scroll"
        className="mb-6"
        value={filters.categoryId}
        onChange={(categoryId) => changeFilter("categoryId", categoryId)}
        options={[
          { value: "all", label: "All dishes", count: totalForTabs },
          ...sortedCategories.map((category) => ({
            value: category.id,
            label: category.name,
            count: counts[category.id] ?? 0,
          })),
        ]}
      />

      {/* aria-live: screen readers announce the new count when filters change */}
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {items.length} dishes
      </p>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <li key={item.id}>
              <MenuItemCard
                item={item}
                categoryName={categoryName.get(item.categoryId) ?? "No category"}
                onToggleAvailable={
                  can("menu.toggleAvailability") ? toggleAvailable : undefined
                }
                onEdit={can("menu.edit") ? openForm : undefined}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No dishes match"
          description="Try another word, or clear the filters to see the whole menu."
          className="bg-surface"
          action={
            filtersActive && (
              <Button variant="secondary" onClick={() => setFilters(NO_MENU_FILTERS)}>
                Clear filters
              </Button>
            )
          }
        />
      )}

      <PhotoCredits items={items} />

      <MenuItemFormDialog
        key={formKey}
        open={form.open}
        item={form.open ? form.item : undefined}
        onClose={() => setForm({ open: false })}
        onSaved={handleSaved}
      />
    </>
  );
}
