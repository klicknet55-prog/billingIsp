export const CSV_IMPORT_MAX_ROWS = 500;

export const CSV_TEMPLATE_HEADERS = [
  "nama",
  "noWa",
  "alamat",
  "paket",
  "router",
  "odp",
  "tglDaftar",
  "billingDay",
  "connectionType",
  "username",
  "password",
] as const;

export const CSV_TEMPLATE_CONTENT = `${CSV_TEMPLATE_HEADERS.join(",")}
Budi Santoso,081234567890,Jl. Merdeka 1,Home 20,,ODP-001,2026-01-15,15,pppoe,budi001,secret123
`;

export type CsvImportRow = {
  line: number;
  nama: string;
  noWa: string;
  alamat?: string;
  paket?: string;
  router?: string;
  odp?: string;
  tglDaftar?: string;
  billingDay?: string;
  connectionType?: string;
  username?: string;
  password?: string;
};

const HEADER_ALIASES: Record<string, keyof Omit<CsvImportRow, "line">> = {
  nama: "nama",
  name: "nama",
  nowa: "noWa",
  no_wa: "noWa",
  whatsapp: "noWa",
  wa: "noWa",
  alamat: "alamat",
  address: "alamat",
  paket: "paket",
  package: "paket",
  paket_internet: "paket",
  router: "router",
  odp: "odp",
  tgldaftar: "tglDaftar",
  tgl_daftar: "tglDaftar",
  tanggal_daftar: "tglDaftar",
  billingday: "billingDay",
  billing_day: "billingDay",
  hari_tagihan: "billingDay",
  connectiontype: "connectionType",
  connection_type: "connectionType",
  tipe: "connectionType",
  username: "username",
  user: "username",
  password: "password",
  pass: "password",
};

function normalizeHeader(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return HEADER_ALIASES[key] ?? raw.trim();
}

/** Parser CSV ringkas — dukung field dalam tanda kutip. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseCsvText(text: string): CsvImportRow[] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]!);
  const headers = headerCells.map(normalizeHeader);

  const namaIdx = headers.indexOf("nama");
  const noWaIdx = headers.indexOf("noWa");
  if (namaIdx < 0 || noWaIdx < 0) {
    throw new Error("CSV wajib punya kolom header: nama, noWa");
  }

  const rows: CsvImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    if (cells.every((c) => !c.trim())) continue;

    const row: CsvImportRow = { line: i + 1, nama: "", noWa: "" };
    for (let idx = 0; idx < headers.length; idx++) {
      const h = headers[idx]!;
      const val = cells[idx]?.trim() ?? "";
      if (h === "nama") row.nama = val;
      else if (h === "noWa") row.noWa = val;
      else if (
        h === "alamat" ||
        h === "paket" ||
        h === "router" ||
        h === "odp" ||
        h === "tglDaftar" ||
        h === "billingDay" ||
        h === "connectionType" ||
        h === "username" ||
        h === "password"
      ) {
        (row as unknown as Record<string, string | undefined>)[h] = val || undefined;
      }
    }

    rows.push(row);
    if (rows.length > CSV_IMPORT_MAX_ROWS) {
      throw new Error(`Maksimal ${CSV_IMPORT_MAX_ROWS} baris data per import.`);
    }
  }

  return rows;
}
