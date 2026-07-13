import {
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  MessageSquareWarning,
  Navigation,
  Plus,
  QrCode,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FinanceNavItem } from "@/components/mobile/finance";

export type MobileNavItem =
  | { type: "link"; href: string; label: string; icon: LucideIcon; match?: "exact" | "prefix" }
  | { type: "action"; id: string; label: string; icon: LucideIcon };

export const PORTAL_FINANCE_NAV: FinanceNavItem[] = [
  { type: "link", href: "/portal", label: "Beranda", icon: Home, match: "exact" },
  { type: "link", href: "/portal/tagihan", label: "Tagihan", icon: FileText, match: "prefix" },
  { type: "fab", id: "bayar", label: "Bayar", icon: QrCode, href: "/portal/tagihan" },
  { type: "link", href: "/portal/tagihan#riwayat", label: "Riwayat", icon: CreditCard, match: "prefix" },
  { type: "link", href: "/portal/akun", label: "Akun", icon: User, match: "prefix" },
];

export function adminFinanceNavItems(role: string): FinanceNavItem[] {
  if (role === "kolektor") {
    return [
      { type: "link", href: "/kolektor", label: "Tugas", icon: ListChecks, match: "exact" },
      { type: "fab", id: "navigate", label: "Nav", icon: Navigation },
      { type: "link", href: "/kolektor/community", label: "Aktivitas", icon: Users, match: "prefix" },
      { type: "link", href: "/kolektor/profil", label: "Akun", icon: User, match: "prefix" },
    ];
  }
  if (role === "teknisi") {
    return [
      { type: "link", href: "/dashboard", label: "Beranda", icon: Home, match: "exact" },
      { type: "link", href: "/dashboard/tiket", label: "Tiket", icon: Ticket, match: "prefix" },
      { type: "fab", id: "quick", label: "Menu", icon: Menu, href: "/dashboard/menu" },
      { type: "link", href: "/dashboard/menu", label: "Lainnya", icon: Menu, match: "exact" },
    ];
  }
  return [
    { type: "link", href: "/dashboard", label: "Beranda", icon: LayoutDashboard, match: "exact" },
    { type: "link", href: "/dashboard/tagihan", label: "Tagihan", icon: CreditCard, match: "prefix" },
    { type: "fab", id: "quick", label: "Tambah", icon: Plus, href: "/dashboard/pelanggan/tambah" },
    { type: "link", href: "/dashboard/pelanggan", label: "Pelanggan", icon: Users, match: "prefix" },
    { type: "link", href: "/dashboard/menu", label: "Menu", icon: Menu, match: "exact" },
  ];
}

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
      { type: "link", href: "/dashboard/menu", label: "Menu", icon: Menu, match: "exact" },
    ];
  }
  return [
    { type: "link", href: "/dashboard", label: "Beranda", icon: LayoutDashboard, match: "exact" },
    { type: "link", href: "/dashboard/pelanggan", label: "Pelanggan", icon: Users, match: "prefix" },
    { type: "link", href: "/dashboard/tagihan", label: "Tagihan", icon: CreditCard, match: "prefix" },
    { type: "link", href: "/dashboard/menu", label: "Menu", icon: Menu, match: "exact" },
  ];
}

/** @deprecated use PORTAL_FINANCE_NAV on mobile */
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
  "/dashboard/menu",
  "/kolektor",
  "/kolektor/profil",
  "/kolektor/community",
  "/portal",
  "/portal/tagihan",
  "/portal/lapor",
  "/portal/akun",
]);
