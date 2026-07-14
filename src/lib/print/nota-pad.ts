/**
 * Lebar kolom printer thermal.
 * PHPNuxBill default ~37, di `createInvoice` di-set 30; 35 pas untuk label ID + tanggal.
 */
export const NOTA_CHAR_WIDTH = 35;

/** Panjang tampilan string (code point), bukan byte. */
export function notaDisplayLen(text: string): number {
  return Array.from(text).length;
}

function truncateToWidth(text: string, width: number): string {
  const chars = Array.from(text);
  if (chars.length <= width) return text;
  if (width <= 1) return "…";
  return chars.slice(0, Math.max(1, width - 1)).join("") + "…";
}

/** Center pad — setara `Lang::pad($text, ' ', 2)`. */
export function notaPadCenter(text: string, cols = NOTA_CHAR_WIDTH): string {
  const t = text.trim();
  const len = notaDisplayLen(t);
  if (len >= cols) return truncateToWidth(t, cols);
  const space = cols - len;
  const left = Math.floor(space / 2);
  const right = space - left;
  return `${" ".repeat(left)}${t}${" ".repeat(right)}`;
}

/**
 * Left + right pada satu baris fixed-width — setara `Lang::pads($left, $right, ' ')`.
 * PHP: `$textLeft . str_pad($textRight, $cols - strlen($textLeft), ' ', STR_PAD_LEFT)`
 */
export function notaPads(textLeft: string, textRight: string, cols = NOTA_CHAR_WIDTH): string {
  let left = textLeft;
  let right = textRight.trim();
  let leftLen = notaDisplayLen(left);
  if (leftLen >= cols) {
    return truncateToWidth(left, cols);
  }
  const target = cols - leftLen;
  if (notaDisplayLen(right) > target) {
    right = truncateToWidth(right, target);
  }
  const padLen = target - notaDisplayLen(right);
  return `${left}${" ".repeat(Math.max(0, padLen))}${right}`;
}

/** Garis penuh — setara `Lang::pad("", '=')`. */
export function notaPadLine(fill = "=", cols = NOTA_CHAR_WIDTH): string {
  return fill.repeat(cols);
}
