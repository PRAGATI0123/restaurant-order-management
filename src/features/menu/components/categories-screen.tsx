"use client";

import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { assertCanDeleteCategory, sortCategories } from "@/domain/menu/catalog-rules";
import { countByCategory } from "@/domain/menu/menu-rules";
import { DomainError } from "@/domain/errors";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuCategory } from "@/types/menu";
import { CategoryFormDialog } from "./category-form-dialog";

export function CategoriesScreen() {
  const categories = useMenuStore((s) => s.categories);
  const items = useMenuStore((s) => s.items);
  const moveCategory = useMenuStore((s) => s.moveCategory);
  const deleteCategory = useMenuStore((s) => s.deleteCategory);

  const ordered = useMemo(() => sortCategories(categories), [categories]);
  const counts = useMemo(() => countByCategory(items), [items]);

  const [form, setForm] = useState<{ open: boolean; category?: MenuCategory }>({
    open: false,
  });
  const [formKey, setFormKey] = useState(0);
  const [toDelete, setToDelete] = useState<MenuCategory>();

  function openForm(category?: MenuCategory) {
    setFormKey((k) => k + 1);
    setForm({ open: true, category });
  }

  /** Check the rule first: a category with dishes can't be deleted. */
  function askToDelete(category: MenuCategory) {
    try {
      assertCanDeleteCategory(category, items);
      setToDelete(category);
    } catch (error) {
      if (error instanceof DomainError) toast.error(error.message);
      else throw error;
    }
  }

  return (
    <>
      <PageHeader
        title="Menu Categories"
        description="The sections of your menu, in the order guests and staff see them."
        back={{ href: "/menu", label: "Back to menu" }}
        actions={
          <Button onClick={() => openForm()}>
            <Plus aria-hidden="true" /> Add category
          </Button>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No categories yet"
          description="Add your first section, like Starters or Drinks."
          className="bg-surface"
        />
      ) : (
        <Card>
          <ol className="divide-y divide-border">
            {ordered.map((category, index) => {
              const count = counts[category.id] ?? 0;
              return (
                <li key={category.id} className="flex items-center gap-3 py-2 pr-2 pl-5">
                  <span className="w-6 text-sm text-muted-foreground tabular-nums">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{category.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {count} {count === 1 ? "dish" : "dishes"}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveCategory(category.id, "up")}
                    aria-label={`Move ${category.name} up`}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === ordered.length - 1}
                    onClick={() => moveCategory(category.id, "down")}
                    aria-label={`Move ${category.name} down`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openForm(category)}
                    aria-label={`Rename ${category.name}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => askToDelete(category)}
                    aria-label={`Delete ${category.name}`}
                    className="text-danger"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <CategoryFormDialog
        key={formKey}
        open={form.open}
        category={form.category}
        onClose={() => setForm({ open: false })}
      />

      <ConfirmDialog
        open={toDelete !== undefined}
        onClose={() => setToDelete(undefined)}
        onConfirm={() => {
          if (!toDelete) return;
          deleteCategory(toDelete.id);
          toast.success(`${toDelete.name} deleted`);
        }}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        description="It has no dishes, so nothing else changes. This can't be undone."
        confirmLabel="Delete category"
      />
    </>
  );
}
