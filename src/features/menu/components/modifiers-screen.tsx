"use client";

import { ListChecks, Pencil, Plus, Ruler, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { dishesUsing } from "@/domain/menu/catalog-rules";
import { formatPrice } from "@/domain/money";
import { useMenuStore } from "@/stores/menu-store";
import type { Id } from "@/types/common";
import type { AddOn, MenuItem, ModifierGroup } from "@/types/menu";
import { AddOnFormDialog } from "./add-on-form-dialog";
import { OptionGroupFormDialog } from "./option-group-form-dialog";
import { SizesFormDialog } from "./sizes-form-dialog";

type Tab = "sizes" | "add-ons" | "groups";

/** One open dialog at a time. `key` makes each opening start with fresh fields. */
type OpenForm =
  | { kind: "none" }
  | { kind: "sizes"; dishId?: Id }
  | { kind: "add-on"; addOn?: AddOn }
  | { kind: "group"; group?: ModifierGroup };

type PendingDelete =
  { kind: "add-on"; item: AddOn } | { kind: "group"; item: ModifierGroup };

/** "Paneer Tikka, Butter Chicken and 3 more". */
function dishList(dishes: MenuItem[]): string {
  if (dishes.length === 0) return "Not on any dish yet";
  const names = dishes.slice(0, 2).map((d) => d.name);
  const rest = dishes.length - names.length;
  return rest > 0 ? `${names.join(", ")} and ${rest} more` : names.join(" and ");
}

/** "Choose 1 · required", "Up to 2 · optional". */
function groupRule(group: ModifierGroup): string {
  const how = group.maxSelect === 1 ? "Choose 1" : `Up to ${group.maxSelect}`;
  return `${how} · ${group.minSelect > 0 ? "required" : "optional"}`;
}

export function ModifiersScreen() {
  const items = useMenuStore((s) => s.items);
  const addOns = useMenuStore((s) => s.addOns);
  const groups = useMenuStore((s) => s.modifierGroups);
  const deleteAddOn = useMenuStore((s) => s.deleteAddOn);
  const deleteOptionGroup = useMenuStore((s) => s.deleteOptionGroup);

  const [tab, setTab] = useState<Tab>("sizes");
  const [form, setForm] = useState<OpenForm>({ kind: "none" });
  const [formKey, setFormKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>();

  const dishesWithSizes = items.filter((item) => item.variants.length > 0);

  function open(next: OpenForm) {
    setFormKey((k) => k + 1);
    setForm(next);
  }
  const close = () => setForm({ kind: "none" });

  const addButton = {
    sizes: (
      <Button onClick={() => open({ kind: "sizes" })}>
        <Plus aria-hidden="true" /> Add sizes to a dish
      </Button>
    ),
    "add-ons": (
      <Button onClick={() => open({ kind: "add-on" })}>
        <Plus aria-hidden="true" /> New add-on
      </Button>
    ),
    groups: (
      <Button onClick={() => open({ kind: "group" })}>
        <Plus aria-hidden="true" /> New option group
      </Button>
    ),
  }[tab];

  const deleteCount =
    pendingDelete &&
    dishesUsing(
      items,
      pendingDelete.kind === "add-on" ? "addOnIds" : "modifierGroupIds",
      pendingDelete.item.id,
    ).length;

  return (
    <>
      <PageHeader
        title="Sizes, Add-ons and Options"
        description="What a guest can choose when ordering a dish."
        back={{ href: "/menu", label: "Back to menu" }}
        actions={addButton}
      />

      <ChipGroup<Tab>
        label="Section"
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: "sizes", label: "Sizes", count: dishesWithSizes.length },
          { value: "add-ons", label: "Add-ons", count: addOns.length },
          { value: "groups", label: "Option groups", count: groups.length },
        ]}
      />

      {/* ── Sizes ─────────────────────────────────────────────────────── */}
      {tab === "sizes" &&
        (dishesWithSizes.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="No dish has sizes"
            description="Give a dish sizes like Half and Full, each with its own price."
            className="bg-surface"
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {dishesWithSizes.map((dish) => (
              <li key={dish.id}>
                <Card className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{dish.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {dish.variants.map((size) => (
                        <Badge key={size.id} variant="outline">
                          {size.name} · {formatPrice(size.pricePaise)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => open({ kind: "sizes", dishId: dish.id })}
                    aria-label={`Edit sizes for ${dish.name}`}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        ))}

      {/* ── Add-ons ───────────────────────────────────────────────────── */}
      {tab === "add-ons" &&
        (addOns.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No add-ons yet"
            description="Add extras guests can pay for, like Extra cheese."
            className="bg-surface"
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {addOns.map((addOn) => {
              const using = dishesUsing(items, "addOnIds", addOn.id);
              return (
                <li key={addOn.id}>
                  <Card className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">
                        {addOn.name}{" "}
                        <span className="font-normal text-muted-foreground tabular-nums">
                          +{formatPrice(addOn.pricePaise)}
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground">{dishList(using)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => open({ kind: "add-on", addOn })}
                      aria-label={`Edit ${addOn.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger"
                      onClick={() => setPendingDelete({ kind: "add-on", item: addOn })}
                      aria-label={`Delete ${addOn.name}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        ))}

      {/* ── Option groups ─────────────────────────────────────────────── */}
      {tab === "groups" &&
        (groups.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No option groups yet"
            description="Add questions the kitchen needs answered, like Spice level."
            className="bg-surface"
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => {
              const using = dishesUsing(items, "modifierGroupIds", group.id);
              return (
                <li key={group.id}>
                  <Card className="flex items-start gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">{groupRule(group)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.options.map((option) => (
                          <Badge key={option.id} variant="outline">
                            {option.name}
                            {option.pricePaise > 0 &&
                              ` +${formatPrice(option.pricePaise)}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {dishList(using)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => open({ kind: "group", group })}
                      aria-label={`Edit ${group.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger"
                      onClick={() => setPendingDelete({ kind: "group", item: group })}
                      aria-label={`Delete ${group.name}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        ))}

      {/* Dialogs. Each gets a new key when opened, so its fields start fresh. */}
      <SizesFormDialog
        key={`sizes-${formKey}`}
        open={form.kind === "sizes"}
        dishId={form.kind === "sizes" ? form.dishId : undefined}
        onClose={close}
      />
      <AddOnFormDialog
        key={`add-on-${formKey}`}
        open={form.kind === "add-on"}
        addOn={form.kind === "add-on" ? form.addOn : undefined}
        onClose={close}
      />
      <OptionGroupFormDialog
        key={`group-${formKey}`}
        open={form.kind === "group"}
        group={form.kind === "group" ? form.group : undefined}
        onClose={close}
      />

      <ConfirmDialog
        open={pendingDelete !== undefined}
        onClose={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "add-on") deleteAddOn(pendingDelete.item.id);
          else deleteOptionGroup(pendingDelete.item.id);
          toast.success(`${pendingDelete.item.name} deleted`);
        }}
        title={`Delete ${pendingDelete?.item.name ?? ""}?`}
        description={
          deleteCount
            ? `It will be removed from ${deleteCount} ${deleteCount === 1 ? "dish" : "dishes"}. Orders already taken keep it. This can't be undone.`
            : "No dish uses it. This can't be undone."
        }
        confirmLabel="Delete"
      />
    </>
  );
}
