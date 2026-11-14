"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { moveTableTo } from "@/domain/tables/layout";
import { assertCanDeleteTable } from "@/domain/tables/table-guards";
import { cn } from "@/lib/utils/cn";
import { tryAction } from "@/lib/utils/try-action";
import { useServiceStore, type TableLayout } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { RestaurantTable } from "@/types/table";
import { FloorCanvas, gridPlacement } from "./floor-canvas";
import { TableFormDialog } from "./table-form-dialog";

const toLayout = ({ id, name, seats, shape, x, y }: RestaurantTable): TableLayout => ({
  id,
  name,
  seats,
  shape,
  x,
  y,
});

/** How far one grid cell is, in pixels, measured from the real canvas. */
function measureStep(canvas: HTMLElement | null): { x: number; y: number } {
  if (!canvas) return { x: 64, y: 64 };
  const style = getComputedStyle(canvas);
  const column = parseFloat(style.gridTemplateColumns.split(" ")[0] ?? "56");
  const row = parseFloat(style.gridTemplateRows.split(" ")[0] ?? "56");
  return {
    x: column + parseFloat(style.columnGap || "0"),
    y: row + parseFloat(style.rowGap || "0"),
  };
}

/**
 * THE FLOOR PLAN EDITOR
 * Works on a DRAFT copy of the tables. Nothing changes for other staff until
 * "Save layout"; "Cancel" throws the draft away.
 *
 * Moving a table, three ways:
 *  - drag it (mouse or finger), it snaps to the grid when dropped
 *  - keyboard: Tab to it, Space to pick up, arrows move one cell, Space to drop
 *  - select it and use the arrow buttons
 */
export function FloorEditor() {
  const router = useRouter();
  const liveTables = useServiceStore((s) => s.tables);
  const orders = useServiceStore((s) => s.orders);
  const saveLayout = useServiceStore((s) => s.saveLayout);

  const [initial] = useState(() => liveTables.map(toLayout));
  const [draft, setDraft] = useState<TableLayout[]>(initial);
  const [selectedId, setSelectedId] = useState<Id>();
  const [form, setForm] = useState<{ open: boolean; table?: TableLayout }>({
    open: false,
  });
  const [formKey, setFormKey] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dndId = useId(); // stable ids for dnd-kit, so server and browser HTML match

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const selected = draft.find((t) => t.id === selectedId);

  // Mouse/finger: a drag starts after moving 6px, so a simple tap still selects.
  // Keyboard: each arrow key moves the table by exactly one grid cell.
  const keyboardStep: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
    const step = measureStep(canvasRef.current);
    const moves: Record<string, [number, number]> = {
      ArrowRight: [step.x, 0],
      ArrowLeft: [-step.x, 0],
      ArrowDown: [0, step.y],
      ArrowUp: [0, -step.y],
    };
    const move = moves[event.code];
    if (!move) return undefined;
    event.preventDefault();
    return { x: currentCoordinates.x + move[0], y: currentCoordinates.y + move[1] };
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardStep }),
  );

  function moveBy(tableId: Id, dx: number, dy: number) {
    const table = draft.find((t) => t.id === tableId);
    if (!table || (dx === 0 && dy === 0)) return;
    tryAction(() => setDraft(moveTableTo(draft, tableId, table.x + dx, table.y + dy)));
  }

  function handleDragEnd({ active, delta }: DragEndEvent) {
    const step = measureStep(canvasRef.current);
    setSelectedId(String(active.id));
    moveBy(String(active.id), Math.round(delta.x / step.x), Math.round(delta.y / step.y));
  }

  function removeSelected() {
    if (!selected) return;
    const live = liveTables.find((t) => t.id === selected.id);
    // A brand-new table (not saved yet) can always go. A real one must be free.
    if (live && !tryAction(() => assertCanDeleteTable(live, liveTables, orders))) return;
    setDraft((tables) => tables.filter((t) => t.id !== selected.id));
    setSelectedId(undefined);
    toast(`${selected.name} removed`, {
      description: "Save the layout to keep this change.",
    });
  }

  function openForm(table?: TableLayout) {
    setFormKey((k) => k + 1);
    setForm({ open: true, table });
  }

  return (
    <>
      <PageHeader
        title="Floor Plan Editor"
        description="Drag tables to arrange the room. Tap a table to edit it."
        back={{ href: "/tables", label: "Back to tables" }}
        actions={
          <>
            <Button variant="secondary" onClick={() => openForm()}>
              <Plus aria-hidden="true" /> Add table
            </Button>
            <Button
              variant="secondary"
              onClick={() => (dirty ? setConfirmDiscard(true) : router.push("/tables"))}
            >
              Cancel
            </Button>
            <Button
              disabled={!dirty}
              onClick={() => {
                saveLayout(draft);
                toast.success("Floor plan saved");
                router.push("/tables");
              }}
            >
              <Save aria-hidden="true" /> Save layout
            </Button>
          </>
        }
      />

      <div className="mb-3 flex min-h-6 items-center gap-2 text-sm text-muted-foreground">
        {dirty ? <Badge variant="accent">Unsaved changes</Badge> : "No changes yet."}
      </div>

      <DndContext id={dndId} sensors={sensors} onDragEnd={handleDragEnd}>
        <FloorCanvas ref={canvasRef}>
          {draft.map((table) => (
            <DraggableTable
              key={table.id}
              table={table}
              selected={table.id === selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </FloorCanvas>
      </DndContext>

      <Card className="mt-4 p-4">
        {selected ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-32">
              <p className="font-display text-2xl font-semibold">{selected.name}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="size-4" aria-hidden="true" /> {selected.seats} seats ·{" "}
                {selected.shape}
              </p>
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Move table">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Move left"
                onClick={() => moveBy(selected.id, -1, 0)}
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Move up"
                onClick={() => moveBy(selected.id, 0, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Move down"
                onClick={() => moveBy(selected.id, 0, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Move right"
                onClick={() => moveBy(selected.id, 1, 0)}
              >
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={() => openForm(selected)}>
                <Pencil aria-hidden="true" /> Edit
              </Button>
              <Button variant="danger" onClick={removeSelected}>
                <Trash2 aria-hidden="true" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Tap a table to rename it, change its seats, or remove it.
          </p>
        )}
      </Card>

      <TableFormDialog
        key={formKey}
        open={form.open}
        table={form.table}
        draft={draft}
        onClose={() => setForm({ open: false })}
        onSave={(saved) => {
          setDraft((tables) =>
            tables.some((t) => t.id === saved.id)
              ? tables.map((t) => (t.id === saved.id ? saved : t))
              : [...tables, saved],
          );
          setSelectedId(saved.id);
        }}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => router.push("/tables")}
        title="Discard your changes?"
        description="The floor plan goes back to how it was. Other staff never saw these changes."
        confirmLabel="Discard changes"
      />
    </>
  );
}

function DraggableTable({
  table,
  selected,
  onSelect,
}: {
  table: TableLayout;
  selected: boolean;
  onSelect: (id: Id) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onSelect(table.id)}
      aria-label={`${table.name}, ${table.seats} seats. Drag to move.`}
      style={{
        ...gridPlacement(table),
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={cn(
        // touch-none: the finger drags the table instead of scrolling the page
        "flex touch-none flex-col justify-between border-2 bg-surface p-3 text-left shadow-sm select-none",
        table.shape === "round" ? "rounded-[2rem]" : "rounded-xl",
        selected ? "border-primary ring-4 ring-primary/30" : "border-wood/60",
        isDragging ? "z-10 cursor-grabbing opacity-90 shadow-xl" : "cursor-grab",
      )}
    >
      <span className="font-display text-xl font-semibold">{table.name}</span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="size-3.5" aria-hidden="true" /> {table.seats}
      </span>
    </button>
  );
}
