export const PROFILE_CHANGE_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "birthdate",
  "gender",
  "street",
  "postal_code",
  "city",
  "country",
] as const;

export type ProfileChangeField = (typeof PROFILE_CHANGE_FIELDS)[number];

export type ProfileChangeValues = Record<ProfileChangeField, string | null>;

export const PROFILE_CHANGE_FIELD_LABELS: Record<ProfileChangeField, string> = {
  first_name: "Vorname",
  last_name: "Nachname",
  phone: "Telefon",
  birthdate: "Geburtsdatum",
  gender: "Geschlecht",
  street: "Straße",
  postal_code: "PLZ",
  city: "Ort",
  country: "Land",
};

export function formatProfileChangeValue(
  field: ProfileChangeField,
  value: string | null | undefined,
): string {
  const v = (value ?? "").trim();
  if (!v) return "—";
  if (field === "gender") {
    if (v === "m") return "männlich";
    if (v === "w") return "weiblich";
    if (v === "d") return "divers";
  }
  return v;
}

export function normalizeProfileChangeValue(
  field: ProfileChangeField,
  value: string | null | undefined,
): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (field === "gender" || field === "first_name" || field === "last_name" || field === "country") {
    return v;
  }
  return v;
}

export function diffProfileChanges(
  before: Partial<Record<ProfileChangeField, string | null | undefined>>,
  after: Partial<Record<ProfileChangeField, string | null | undefined>>,
): { previous: Partial<ProfileChangeValues>; proposed: Partial<ProfileChangeValues> } {
  const previous: Partial<ProfileChangeValues> = {};
  const proposed: Partial<ProfileChangeValues> = {};
  for (const field of PROFILE_CHANGE_FIELDS) {
    const a = normalizeProfileChangeValue(field, before[field]);
    const b = normalizeProfileChangeValue(field, after[field]);
    if ((a ?? null) !== (b ?? null)) {
      previous[field] = a;
      proposed[field] = b;
    }
  }
  return { previous, proposed };
}
