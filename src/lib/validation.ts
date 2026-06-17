import type { z } from "zod";

export type FieldErrors = Record<string, string>;
export type FormResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: FieldErrors };

/** Parse FormData dengan schema Zod, kembalikan data atau error per field. */
export function parseForm<T>(schema: z.ZodType<T>, formData: FormData): FormResult<T> {
  const obj = Object.fromEntries(formData.entries());
  const res = schema.safeParse(obj);
  if (res.success) return { ok: true, data: res.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0]?.toString() ?? "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}
