/** Replace [[placeholder]] in template body (case-insensitive keys). */
export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return body.replace(/\[\[([a-z0-9_]+)\]\]/gi, (match, key: string) => {
    const normalized = key.toLowerCase();
    for (const [k, v] of Object.entries(vars)) {
      if (k.toLowerCase() === normalized) {
        if (v === null || v === undefined || v === "") return match;
        return String(v);
      }
    }
    return match;
  });
}
