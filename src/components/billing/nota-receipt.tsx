import Image from "next/image";
import { formatDate, formatRupiah } from "@/lib/utils";

export type NotaLineItem = {
  periode: string;
  label: string;
  amount: number;
};

export type NotaReceiptProps = {
  namaUsaha: string;
  logoUrl?: string | null;
  noNota: string;
  pelangganNama: string;
  pelangganWa?: string | null;
  pelangganAlamat?: string | null;
  tglBayar: Date | null | undefined;
  metodeBayar?: string | null;
  lineItems: NotaLineItem[];
  total: number;
  /** Sembunyikan detail pelanggan (portal: pelanggan sudah tahu dirinya sendiri). */
  compactPelanggan?: boolean;
};

function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function Divider() {
  return <div className="border-t border-dashed border-foreground/25" />;
}

export function NotaReceipt({
  namaUsaha,
  logoUrl,
  noNota,
  pelangganNama,
  pelangganWa,
  pelangganAlamat,
  tglBayar,
  metodeBayar,
  lineItems,
  total,
  compactPelanggan = false,
}: NotaReceiptProps) {
  const items =
    lineItems.length > 0
      ? lineItems
      : [{ periode: "-", label: "Pembayaran tagihan", amount: total }];

  return (
    <article
      id="nota-print"
      className="mx-auto w-full max-w-[22rem] rounded-lg border bg-card text-card-foreground shadow-sm print:max-w-none print:rounded-none print:border print:shadow-none"
    >
      <div className="space-y-4 p-6 print:p-4">
        <header className="space-y-2 text-center">
          {logoUrl ? (
            <div className="relative mx-auto h-12 w-12 overflow-hidden rounded-md">
              <Image src={logoUrl} alt="" fill className="object-contain" unoptimized />
            </div>
          ) : null}
          <div>
            <h1 className="text-base font-bold uppercase tracking-wide">{namaUsaha}</h1>
            <p className="text-xs text-muted-foreground">Bukti Pembayaran Layanan Internet</p>
          </div>
          <span className="inline-block rounded border border-emerald-600/40 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
            LUNAS
          </span>
        </header>

        <Divider />

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">No. Nota</dt>
          <dd className="font-mono font-semibold">{noNota}</dd>
          <dt className="text-muted-foreground">Tanggal</dt>
          <dd>{formatDateTime(tglBayar)}</dd>
          <dt className="text-muted-foreground">Metode</dt>
          <dd className="font-medium">{metodeBayar ?? "—"}</dd>
        </dl>

        {!compactPelanggan ? (
          <>
            <Divider />
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">Pelanggan</p>
              <p className="font-semibold">{pelangganNama}</p>
              {pelangganWa ? <p className="text-muted-foreground">{pelangganWa}</p> : null}
              {pelangganAlamat ? (
                <p className="text-muted-foreground leading-snug">{pelangganAlamat}</p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <Divider />
            <p className="text-center text-xs text-muted-foreground">
              Atas nama <span className="font-semibold text-foreground">{pelangganNama}</span>
            </p>
          </>
        )}

        <Divider />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Rincian pembayaran</p>
          <ul className="space-y-1.5 text-xs">
            {items.map((item) => (
              <li key={`${item.periode}-${item.label}`} className="flex items-start justify-between gap-3">
                <span className="min-w-0 leading-snug">{item.label}</span>
                <span className="shrink-0 font-mono tabular-nums">{formatRupiah(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>

        <Divider />

        <div className="flex items-center justify-between text-sm font-bold">
          <span>Total dibayar</span>
          <span className="font-mono text-base tabular-nums">{formatRupiah(total)}</span>
        </div>

        <footer className="space-y-1 pt-2 text-center text-[11px] text-muted-foreground">
          <p>Terima kasih atas pembayaran Anda.</p>
          <p>Dicetak {formatDate(new Date())}</p>
        </footer>
      </div>
    </article>
  );
}
