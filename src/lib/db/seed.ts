/**
 * Seed data demo agar aplikasi langsung bisa dicoba.
 * Jalankan: `npm run db:seed` (otomatis memuat .env).
 *
 * Akun demo:
 *  - Super Admin : super@netmanage.app / password123
 *  - Owner ISP   : owner@demo.net      / password123
 *  - Kolektor    : kolektor@demo.net   / password123
 *  - Teknisi     : teknisi@demo.net    / password123
 *  - Pelanggan   : login OTP via nomor 081200000001 (kode tampil di console)
 */
import { db } from "./index";
import {
  invoices,
  kategoriPengeluaran,
  packageTenants,
  paketInternet,
  paymentGatewayLogs,
  pelanggan,
  routers,
  subscriptions,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  tenants,
  users,
} from "./schema";
import { hashPassword } from "../auth/password";
import { encryptSecret } from "../crypto";
import { newId } from "../utils";

const PW = hashPassword("password123");
const day = 24 * 60 * 60 * 1000;
const now = Date.now();

async function reset() {
  // Hapus dengan urutan menghormati foreign key.
  await db.delete(tenantWhatsAppConfigs);
  await db.delete(tenantDuitkuConfigs);
  await db.delete(paymentGatewayLogs);
  await db.delete(invoices);
  await db.delete(pelanggan);
  await db.delete(paketInternet);
  await db.delete(routers);
  await db.delete(kategoriPengeluaran);
  await db.delete(subscriptions);
  await db.delete(users);
  await db.delete(packageTenants);
  await db.delete(tenants);
}

async function main() {
  await reset();

  // --- Paket SaaS ---
  const pkgFree = newId("pkg");
  const pkgStandard = newId("pkg");
  const pkgPremium = newId("pkg");
  await db.insert(packageTenants).values([
    {
      id: pkgFree,
      nama: "Free",
      hargaBulanan: 0,
      limitasi: { maxPelanggan: 25, maxRouter: 1, fitur: ["pelanggan", "invoice"] },
    },
    {
      id: pkgStandard,
      nama: "Standard",
      hargaBulanan: 149000,
      limitasi: {
        maxPelanggan: 250,
        maxRouter: 5,
        fitur: ["pelanggan", "invoice", "tiket", "api_mikrotik"],
      },
    },
    {
      id: pkgPremium,
      nama: "Premium",
      hargaBulanan: 399000,
      limitasi: {
        maxPelanggan: 2000,
        maxRouter: 50,
        fitur: ["pelanggan", "invoice", "tiket", "api_mikrotik", "laporan_keuangan"],
      },
    },
  ]);

  // --- Super Admin (tanpa tenant) ---
  await db.insert(users).values({
    id: newId("usr"),
    tenantId: null,
    nama: "Super Admin",
    email: "super@netmanage.app",
    passwordHash: PW,
    role: "superadmin",
    phone: "628000000000",
  });

  // --- Tenant demo ---
  const tenantId = newId("tnt");
  await db.insert(tenants).values({
    id: tenantId,
    namaUsaha: "Demo Net",
    logoUrl: null,
    domain: "demo",
    status: "active",
    themePreset: "ocean",
    themeMode: "light",
  });

  await db.insert(subscriptions).values({
    id: newId("sub"),
    tenantId,
    packageTenantId: pkgStandard,
    mulai: new Date(now - 10 * day),
    akhir: new Date(now + 20 * day),
    status: "active",
  });

  // --- Staf tenant ---
  const ownerId = newId("usr");
  const kolektorId = newId("usr");
  await db.insert(users).values([
    { id: ownerId, tenantId, nama: "Budi Owner", email: "owner@demo.net", passwordHash: PW, role: "owner", phone: "628111111111" },
    { id: newId("usr"), tenantId, nama: "Andi Admin", email: "admin@demo.net", passwordHash: PW, role: "admin", phone: "628111111112" },
    { id: kolektorId, tenantId, nama: "Cipto Kolektor", email: "kolektor@demo.net", passwordHash: PW, role: "kolektor", phone: "628111111113" },
    { id: newId("usr"), tenantId, nama: "Doni Teknisi", email: "teknisi@demo.net", passwordHash: PW, role: "teknisi", phone: "628111111114" },
  ]);

  // --- Router ---
  const routerId = newId("rtr");
  await db.insert(routers).values({
    id: routerId,
    tenantId,
    nama: "Router Pusat",
    ipAddress: "192.168.88.1",
    apiPort: "8728",
    username: "admin",
    passwordEncrypted: "enc:demo",
    tipe: "pppoe",
    isOnline: true,
  });

  // --- Paket internet ---
  const paket10 = newId("pkt");
  const paket20 = newId("pkt");
  await db.insert(paketInternet).values([
    { id: paket10, tenantId, nama: "Home 10", kecepatan: "10 Mbps", hargaBulanan: 150000 },
    { id: paket20, tenantId, nama: "Home 20", kecepatan: "20 Mbps", hargaBulanan: 250000 },
  ]);

  // --- Pelanggan (dengan koordinat sekitar Jakarta) ---
  const custs = [
    { nama: "Eka Pratama", wa: "081200000001", lat: -6.2, lng: 106.816, paket: paket10, isolated: false },
    { nama: "Fitri Handayani", wa: "081200000002", lat: -6.21, lng: 106.82, paket: paket20, isolated: false },
    { nama: "Gunawan", wa: "081200000003", lat: -6.18, lng: 106.83, paket: paket10, isolated: true },
    { nama: "Hesti", wa: "081200000004", lat: -6.25, lng: 106.79, paket: paket20, isolated: false },
  ];
  const custIds: string[] = [];
  for (const c of custs) {
    const id = newId("pel");
    custIds.push(id);
    await db.insert(pelanggan).values({
      id,
      tenantId,
      nama: c.nama,
      noWa: `62${c.wa.slice(1)}`,
      alamat: "Jl. Contoh No. 1, Jakarta",
      latitude: c.lat,
      longitude: c.lng,
      ipAddress: `10.10.10.${custIds.length + 10}`,
      paketInternetId: c.paket,
      routerId,
      tglJatuhTempo: new Date(now + (custIds.length - 2) * 5 * day),
      isIsolated: c.isolated,
      createdBy: ownerId,
    });
  }

  // --- Invoice (campuran status) ---
  const invStatuses: Array<"unpaid" | "paid" | "overdue"> = ["unpaid", "paid", "overdue", "unpaid"];
  let seq = 1;
  for (let i = 0; i < custIds.length; i++) {
    const status = invStatuses[i];
    await db.insert(invoices).values({
      id: newId("inv"),
      tenantId,
      pelangganId: custIds[i],
      noInvoice: `INV-${String(seq++).padStart(4, "0")}`,
      totalTagihan: i % 2 === 0 ? 150000 : 250000,
      status,
      tglJatuhTempo: new Date(now + (status === "overdue" ? -7 : 5) * day),
      tglLunas: status === "paid" ? new Date(now - 2 * day) : null,
      metodeBayar: status === "paid" ? "QRIS" : null,
      createdBy: ownerId,
    });
  }

  // --- Kategori pengeluaran ---
  await db.insert(kategoriPengeluaran).values([
    { id: newId("kat"), tenantId, nama: "Bandwidth" },
    { id: newId("kat"), tenantId, nama: "Listrik" },
    { id: newId("kat"), tenantId, nama: "Gaji" },
  ]);

  // --- Log pembayaran SaaS contoh ---
  await db.insert(paymentGatewayLogs).values({
    id: newId("pgl"),
    tenantId,
    referenceType: "subscription",
    referenceId: tenantId,
    duitkuOrderId: "MOCK-SUB-0001",
    status: "success",
    amount: 149000,
    paymentMethod: "QRIS",
  });

  // --- Konfigurasi integrasi tenant demo (opsional, fallback dari env) ---
  if (process.env.DUITKU_MERCHANT_CODE && process.env.DUITKU_API_KEY) {
    await db.insert(tenantDuitkuConfigs).values({
      id: newId("tdk"),
      tenantId,
      merchantCode: process.env.DUITKU_MERCHANT_CODE,
      apiKeyEncrypted: encryptSecret(process.env.DUITKU_API_KEY),
      callbackUrl: process.env.DUITKU_CALLBACK_URL || null,
      inquiryUrl: process.env.DUITKU_INQUIRY_URL || null,
      paymentMethod: process.env.DUITKU_PAYMENT_METHOD || "VC",
      isEnabled: true,
    });
  }
  if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
    await db.insert(tenantWhatsAppConfigs).values({
      id: newId("twp"),
      tenantId,
      apiUrl: process.env.WHATSAPP_API_URL,
      apiTokenEncrypted: encryptSecret(process.env.WHATSAPP_API_TOKEN),
      provider: "waba",
      isEnabled: true,
    });
  }

  console.log("Seed selesai. Login: super@netmanage.app / owner@demo.net / kolektor@demo.net (password123)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
