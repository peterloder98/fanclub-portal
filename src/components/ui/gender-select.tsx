import { GENDER_OPTIONS, GENDER_OPTIONS_BINARY } from "@/lib/person/gender";

const selectClass =
  "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]";

export function GenderSelect({
  value,
  onChange,
  name,
  required = true,
  className = selectClass,
  binaryOnly = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  className?: string;
  binaryOnly?: boolean;
}) {
  const options = binaryOnly ? GENDER_OPTIONS_BINARY : GENDER_OPTIONS;
  if (name) {
    return (
      <select name={name} required={required} defaultValue={value || ""} className={className}>
        <option value="" disabled>
          Bitte wählen
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <select
      required={required}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
    >
      <option value="" disabled>
        Bitte wählen
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
