/** Signatur-Block am Ende des E-Mail-Texts ersetzen (Dropdown-Wechsel im Editor). */

function trimEndNewlines(s: string) {
  return s.replace(/\n+$/, "");
}

function endsWithSignature(body: string, signature: string) {
  const b = trimEndNewlines(body.trimEnd());
  const sig = signature.trim();
  if (!sig) return false;
  return b === sig || b.endsWith(`\n\n${sig}`) || b.endsWith(`\n${sig}`);
}

function removeTrailingSignatureOnce(body: string, signature: string) {
  const sig = signature.trim();
  if (!sig || !endsWithSignature(body, sig)) return body.trimEnd();
  const b = trimEndNewlines(body.trimEnd());
  if (b === sig) return "";
  if (b.endsWith(`\n\n${sig}`)) return b.slice(0, -(sig.length + 2)).trimEnd();
  if (b.endsWith(`\n${sig}`)) return b.slice(0, -(sig.length + 1)).trimEnd();
  return b;
}

export function replaceTrailingSignature(
  body: string,
  previousSignature: string | null | undefined,
  nextSignature: string,
  knownSignatures: string[] = [],
) {
  let core = body.trimEnd();

  if (previousSignature?.trim()) {
    core = removeTrailingSignatureOnce(core, previousSignature);
  }

  const seen = new Set<string>();
  for (const known of knownSignatures) {
    const k = known.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    while (endsWithSignature(core, k)) {
      core = removeTrailingSignatureOnce(core, k);
    }
  }

  const next = nextSignature.trim();
  if (!next) return core;
  return core ? `${core}\n\n${next}` : next;
}

export async function buildSignatureTextMap(
  signatureIds: { id: string }[],
  loadText: (id: string) => Promise<string>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    signatureIds.map(async (s) => [s.id, await loadText(s.id)] as const),
  );
  return Object.fromEntries(entries);
}
