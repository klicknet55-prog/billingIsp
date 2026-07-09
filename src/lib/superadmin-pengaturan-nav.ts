/** Submenu Pengaturan superadmin — tab di halaman Pengaturan. */
export const SUPERADMIN_PENGATURAN_NAV = [
  {
    href: "/superadmin/pengaturan/akun",
    label: "Akun Saya",
    description: "Profil & kata sandi superadmin",
  },
  {
    href: "/superadmin/pengaturan/profil-app",
    label: "Profil App",
    description: "Nama aplikasi & tagline",
  },
  {
    href: "/superadmin/pengaturan/logo-brand",
    label: "Logo Brand",
    description: "Logo platform",
  },
  {
    href: "/superadmin/pengaturan/pemilik",
    label: "Pemilik",
    description: "Data pemilik platform",
  },
  {
    href: "/superadmin/pengaturan/alamat",
    label: "Alamat",
    description: "Alamat kantor / operasional",
  },
  {
    href: "/superadmin/pengaturan/telegram",
    label: "Telegram",
    description: "Link grup Telegram",
  },
  {
    href: "/superadmin/pengaturan/halaman-statis",
    label: "Halaman Statis",
    description: "Tentang, Kontak, Syarat & Ketentuan",
  },
  {
    href: "/superadmin/pengaturan/referral",
    label: "Referral",
    description: "Program undang ISP & bonus langganan",
  },
] as const;

export const SUPERADMIN_PENGATURAN_HREF = "/superadmin/pengaturan";

export const PLATFORM_REVALIDATE_PATHS = [
  "/",
  "/login",
  "/register-tenant",
  "/tentang",
  "/kontak",
  "/syarat-ketentuan",
  "/dashboard/community",
  "/kolektor/community",
  "/superadmin/community",
  "/superadmin/mobile-apk",
  SUPERADMIN_PENGATURAN_HREF,
  ...SUPERADMIN_PENGATURAN_NAV.map((item) => item.href),
] as const;
