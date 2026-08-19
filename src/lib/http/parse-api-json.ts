type ParseApiJsonOptions = {
  /** Für 413-Fehler: max. Dateigröße in MB anzeigen */
  maxUploadMb?: number;
  fallbackError?: string;
};

export async function parseApiJsonResponse<T extends { error?: string }>(
  res: Response,
  options: ParseApiJsonOptions = {},
): Promise<T> {
  const { maxUploadMb, fallbackError = "Anfrage fehlgeschlagen" } = options;
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = (await res.text()).trim();
    if (
      res.status === 413 ||
      /request entity too large|payload too large|body exceeded/i.test(text)
    ) {
      const limitHint =
        maxUploadMb != null
          ? ` (max. ${maxUploadMb} MB)`
          : "";
      throw new Error(
        `Datei zu groß — bitte kürzeres Video oder kleinere Datei wählen${limitHint}.`,
      );
    }
    throw new Error(text.slice(0, 240) || `${fallbackError} (${res.status})`);
  }

  return (await res.json()) as T;
}
