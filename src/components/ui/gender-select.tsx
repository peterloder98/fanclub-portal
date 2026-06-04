import { GENDER_OPTIONS } from "@/lib/person/gender";

const selectClass =
  "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]";

export function GenderSelect({
  value,
  onChange,
  name,
  required = true,
  className = selectClass,
}: {
  value: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  className?: string;
}) {
  if (name) {
    return (
      <select name={name} required={required} defaultValue={value || ""} className={className}>
        <option value="" disabled>
          Bitte wählen
        </option>
        {GENDER_OPTIONS.map((o) => (
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
      {GENDER_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
