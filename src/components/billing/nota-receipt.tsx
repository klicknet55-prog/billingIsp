import Image from "next/image";
import {
  NOTA_CHAR_WIDTH,
  buildNotaPlainText,
  type NotaDocumentData,
} from "@/lib/print/nota-document";

export type NotaLineItem = {
  periode: string;
  label: string;
  amount: number;
};

export type NotaReceiptProps = Omit<NotaDocumentData, "tglBayar" | "dibuatPada" | "kedaluwarsaPada"> & {
  tglBayar: Date | string | null | undefined;
  dibuatPada?: Date | string | null;
  kedaluwarsaPada?: Date | string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

/** Struk fixed-width ala PHPNuxBill (pad kiri/kanan), konten center di dalam kotak. */
export function NotaReceipt(props: NotaReceiptProps) {
  const data: NotaDocumentData = {
    ...props,
    tglBayar: toIso(props.tglBayar),
    dibuatPada: toIso(props.dibuatPada ?? props.tglBayar),
    kedaluwarsaPada: toIso(props.kedaluwarsaPada),
    lineItems: props.lineItems ?? [],
  };
  const plain = buildNotaPlainText(data);
  const colStyle = { width: `${NOTA_CHAR_WIDTH}ch`, maxWidth: `${NOTA_CHAR_WIDTH}ch` } as const;

  return (
    <div className="flex w-full justify-center print:block">
      <article
        id="nota-print"
        className="nota-receipt-box inline-block border border-foreground bg-white text-foreground shadow-sm print:shadow-none"
        style={{
          boxSizing: "content-box",
          width: "max-content",
          maxWidth: "100%",
          padding: "12px 10px",
        }}
      >
        <div
          className="mx-auto font-mono text-[12px] leading-[1.35] text-foreground"
          style={{
            ...colStyle,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          }}
        >
          <header className="mb-1.5 flex items-center justify-center gap-1.5 text-center">
            {data.logoUrl ? (
              <div className="relative size-9 shrink-0 overflow-hidden">
                <Image src={data.logoUrl} alt="" fill className="object-contain" unoptimized />
              </div>
            ) : null}
            <h1 className="text-[13px] font-bold tracking-wide break-words">{data.namaUsaha}</h1>
          </header>
          <pre
            id="nota-body"
            className="m-0 overflow-visible whitespace-pre bg-transparent p-0 text-[12px] leading-[1.35] tracking-normal"
          >
            {plain}
          </pre>
        </div>
      </article>
    </div>
  );
}
