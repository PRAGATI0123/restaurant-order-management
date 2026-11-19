"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { DomainError } from "@/domain/errors";
import { validateStaff, type StaffFormValues } from "@/lib/validation/staff";
import { useAuthStore } from "@/stores/auth-store";
import type { Role, Staff } from "@/types/staff";

const ROLES: Role[] = ["manager", "cashier", "waiter", "kitchen"];

/** Add a staff member, or change one's name, role or PIN. */
export function StaffFormDialog({
  open,
  onClose,
  member,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  member?: Staff;
  onSaved: (saved: Staff) => void;
}) {
  const staff = useAuthStore((s) => s.staff);
  const saveStaff = useAuthStore((s) => s.saveStaff);
  const [values, setValues] = useState<StaffFormValues>({
    name: member?.name ?? "",
    role: member?.role ?? "",
    pin: member?.pin ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPin, setShowPin] = useState(false);

  function update<K extends keyof StaffFormValues>(field: K, value: StaffFormValues[K]) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateStaff(values, staff, member?.id);
    if (!result.ok) return setErrors(result.errors);
    try {
      onSaved(saveStaff({ id: member?.id, ...result.data }));
      onClose();
    } catch (e) {
      // e.g. "Keep at least one manager" when changing the last manager's role
      if (e instanceof DomainError) setErrors({ role: e.message });
      else throw e;
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={member ? `Edit ${member.name}` : "Add staff"}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          autoComplete="off"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold" aria-hidden="true">
            Role
          </span>
          <ChipGroup
            label="Role"
            value={values.role}
            onChange={(role) => update("role", role)}
            options={ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
          />
          {errors.role && <p className="text-sm text-danger">{errors.role}</p>}
        </div>
        <div className="flex items-end gap-2">
          <Field
            label="4-digit PIN"
            className="flex-1"
            value={values.pin}
            onChange={(e) => update("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            error={errors.pin}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoComplete="off"
            hint="Used to log in. Keep it private."
          />
          <Button
            variant="ghost"
            size="icon"
            className="mb-7" // lines the eye up with the box, above the hint
            onClick={() => setShowPin((s) => !s)}
            aria-label={showPin ? "Hide PIN" : "Show PIN"}
            aria-pressed={showPin}
          >
            {showPin ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{member ? "Save" : "Add staff"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
