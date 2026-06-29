import { CSV_TEMPLATE_CONTENT } from "@/features/customers/csv-import";
import { requireUser } from "@/lib/auth";

/** Unduh template CSV import pelanggan. */
export async function GET() {
  await requireUser(["owner", "admin"]);
  return new Response(`\uFEFF${CSV_TEMPLATE_CONTENT}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-import-pelanggan.csv"',
    },
  });
}
