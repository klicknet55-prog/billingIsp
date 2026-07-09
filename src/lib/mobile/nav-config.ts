import {
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquareWarning,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type MobileNavItem =
  | { type: "link"; href: string; label: string; icon: LucideIcon; match?: "exact" | "prefix" }
  | { type: "action"; id: string; label: string; icon: LucideIcon };

export function adminNavItems(role: string): MobileNavItem[] {
  if (role === "kolektor") {
    return [
      { type: "link", href: "/kolektor", label: "Tugas", icon: ListChecks, match: "exact" },
      { type: "link", href: "/kolektor/profil", label: "Profil", icon: User, match: "prefix" },
      { type: "action", id: "menu", label: "Menu", icon: Menu },
    ];
  }
  if (role === "teknisi") {
    return [
      { type: "link", href: "/dashboard/tiket", label: "Tiket", icon: Ticket, match: "prefix" },
      { type: "link", href: "/dashboard", label: "Beranda", icon: Home, match: "exact" },
      { type: "action", id: "menu", label: "Menu", icon: Menu },
    ];
  }
  return [
    { type: "link", href: "/dashboard", label: "Beranda", icon: LayoutDashboard, match: "exact" },
    { type: "link", href: "/dashboard/pelanggan", label: "Pelanggan", icon: Users, match: "prefix" },
    { type: "link", href: "/dashboard/tagihan", label: "Tagihan", icon: CreditCard, match: "prefix" },
    { type: "action", id: "menu", label: "Menu", icon: Menu },
  ];
}

export const PORTAL_NAV_ITEMS: MobileNavItem[] = [
  { type: "link", href: "/portal", label: "Beranda", icon: Home, match: "exact" },
  { type: "link", href: "/portal/tagihan", label: "Tagihan", icon: FileText, match: "prefix" },
  { type: "link", href: "/portal/lapor", label: "Lapor", icon: MessageSquareWarning, match: "prefix" },
  { type: "link", href: "/portal/akun", label: "Akun", icon: User, match: "prefix" },
];

export const MOBILE_ROOT_PATHS = new Set([
  "/dashboard",
  "/dashboard/pelanggan",
  "/dashboard/tagihan",
  "/dashboard/community",
  "/dashboard/tiket",
  "/kolektor",
  "/kolektor/profil",
  "/kolektor/community",
  "/portal",
  "/portal/tagihan",
  "/portal/lapor",
  "/portal/akun",
]);
