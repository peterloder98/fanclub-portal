/**
 * Shared numeric input helpers — use for all amount / count fields app-wide.
 * Blocks letters and scientific notation (e/E/+/-) that type=number still allows.
 */

/** Erlaubt nur Ziffern und ein Dezimaltrennzeichen (Komma oder Punkt). */
export function sanitizeDecimalInput(raw: string): string {
  let v = raw.replace(/[^\d.,]/g, "");
  const sepIdx = v.search(/[.,]/);
  if (sepIdx === -1) return v;
  const head = v.slice(0, sepIdx + 1);
  const tail = v.slice(sepIdx + 1).replace(/[.,]/g, "");
  return head + tail;
}

/** Nur Ziffern (optional maxLength). */
export function sanitizeDigitsInput(raw: string, maxLength?: number): string {
  const digits = raw.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function decimalInputProps(): {
  inputMode: "decimal";
  autoComplete: "off";
  onKeyDown: (e: { key: string; preventDefault: () => void }) => void;
} {
  return {
    inputMode: "decimal",
    autoComplete: "off",
    onKeyDown: (e) => {
      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
    },
  };
}

/** Ganzzahlen / PLZ / Tagesfristen — keine Buchstaben, kein Dezimaltrennzeichen. */
export function integerInputProps(): {
  inputMode: "numeric";
  pattern: "[0-9]*";
  autoComplete: "off";
  onKeyDown: (e: { key: string; preventDefault: () => void }) => void;
} {
  return {
    inputMode: "numeric",
    pattern: "[0-9]*",
    autoComplete: "off",
    onKeyDown: (e) => {
      if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
    },
  };
}
