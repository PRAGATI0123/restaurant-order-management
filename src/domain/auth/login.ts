import type { Staff } from "@/types/staff";
import { DomainError } from "../errors";

/**
 * LOGGING IN — rules
 *
 *  - One account, one 4-digit PIN. Typing the PIN is all it takes.
 *  - After 5 wrong PINs in a row, the screen locks for 30 seconds. That makes
 *    guessing the PIN (10,000 possibilities) take days, not minutes.
 *  - The message never shows the right PIN.
 */
export const PIN_LENGTH = 4;
export const MAX_WRONG_PINS = 5;
export const LOCKOUT_MS = 30_000;

/** Returns the account if the PIN is right; throws otherwise. */
export function verifyPin(account: Staff, pin: string): Staff {
  if (pin !== account.pin) throw new DomainError("Wrong PIN. Try again.");
  return account;
}

export type LoginAttempts = {
  /** Wrong PINs in a row since the last success or lockout. */
  wrong: number;
  /** While locked: the time (ms) when typing is allowed again. */
  lockedUntil?: number;
};

export const NO_ATTEMPTS: LoginAttempts = { wrong: 0 };

/** Counts one more wrong PIN; the 5th locks the screen. */
export function afterWrongPin(attempts: LoginAttempts, now: number): LoginAttempts {
  const wrong = attempts.wrong + 1;
  return wrong >= MAX_WRONG_PINS
    ? { wrong: 0, lockedUntil: now + LOCKOUT_MS }
    : { wrong };
}

/** Whole seconds left on the lock, or 0 when typing is allowed. */
export function secondsLocked(attempts: LoginAttempts, now: number): number {
  if (attempts.lockedUntil === undefined) return 0;
  return Math.max(0, Math.ceil((attempts.lockedUntil - now) / 1000));
}
