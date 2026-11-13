/**
 * Thrown when a business rule is broken: a negative price, a quantity of 0,
 * a split that doesn't add up. The message is written for a person to read,
 * so screens can show it directly.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
