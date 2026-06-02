/** German PLZ: exactly 5 digits. */
export function sanitizePostalCode(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 5);
}

export function isValidPostalCode(value: string) {
  return /^\d{5}$/.test(value);
}
