/**
 * Cetak struk ke printer thermal Bluetooth via Web Bluetooth API.
 *
 * Status: implementasi dasar ESC/POS. Service/characteristic UUID berbeda
 * per merek printer, sesuaikan saat integrasi perangkat nyata.
 */
export interface ReceiptData {
  namaUsaha: string;
  noInvoice: string;
  pelanggan: string;
  total: string;
  metode: string;
  tanggal: string;
}

// UUID umum untuk modul printer thermal serial-over-BLE (sesuaikan bila perlu).
const SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
const CHAR_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

function buildEscPos(d: ReceiptData): Uint8Array {
  const enc = new TextEncoder();
  const lines = [
    "\x1b\x40", // init
    "\x1b\x61\x01", // center
    `${d.namaUsaha}\n`,
    "--------------------------------\n",
    "\x1b\x61\x00", // left
    `No   : ${d.noInvoice}\n`,
    `Nama : ${d.pelanggan}\n`,
    `Tgl  : ${d.tanggal}\n`,
    `Bayar: ${d.metode}\n`,
    "--------------------------------\n",
    `TOTAL: ${d.total}\n`,
    "\x1b\x61\x01",
    "\nLUNAS - Terima kasih\n\n\n",
  ];
  return enc.encode(lines.join(""));
}

export async function printReceipt(data: ReceiptData): Promise<{ ok: boolean; message: string }> {
  const nav = navigator as Navigator & { bluetooth?: { requestDevice: (o: unknown) => Promise<unknown> } };
  if (!nav.bluetooth) {
    return { ok: false, message: "Perangkat tidak mendukung Web Bluetooth." };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const device: any = await nav.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHAR_UUID);
    await characteristic.writeValue(buildEscPos(data));
    return { ok: true, message: "Struk terkirim ke printer." };
  } catch (err) {
    return { ok: false, message: `Gagal mencetak: ${(err as Error).message}` };
  }
}
