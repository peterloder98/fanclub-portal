/** Erlaubt nur Ziffern und ein Dezimaltrennzeichen (Komma oder Punkt). */
export function sanitizeDecimalInput(raw: string): string {
  let v = raw.replace(/[^\d.,]/g, "");
  const sepIdx = v.search(/[.,]/);
  if (sepIdx === -1) return v;
  const head = v.slice(0, sepIdx + 1);
  const tail = v.slice(sepIdx + 1).replace(/[.,]/g, "");
  return head + tail;
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
