import {
  BarChart3,
  CreditCard,
  FileText,
  HandCoins,
  Heart,
  LayoutDashboard,
  Map,
  MessageSquare,
  Network,
  Package,
  Plug,
  Router as RouterIcon,
  Settings,
  Shield,
  Ticket,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { dashboardMenuIconKey, type DashboardMenuIconKey } from "@/lib/mobile/dashboard-menu-icons";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly string[];
  requiredFeature?: string;
}

export interface DashboardNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: DashboardNavItem[];
}

export type DashboardNavEntry = DashboardNavItem | DashboardNavGroup;

export function isDashboardNavGroup(entry: DashboardNavEntry): entry is DashboardNavGroup {
  return "children" in entry;
}

export const DASHBOARD_NAV: DashboardNavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/dashboard/tagihan", label: "Tagihan Pelanggan", icon: CreditCard },
  { href: "/dashboard/peta", label: "Peta", icon: Map },
  { href: "/dashboard/paket", label: "Paket Internet", icon: Package },
  { href: "/dashboard/router", label: "Router", icon: RouterIcon },
  {
    href: "/dashboard/vpn",
    label: "VPN",
    icon: Network,
    roles: ["owner", "admin"],
    requiredFeature: "vpn_mikrotik",
  },
  { href: "/dashboard/invoice", label: "Nota", icon: FileText },
  {
    href: "/dashboard/pesan",
    label: "Pesan",
    icon: MessageSquare,
    roles: ["owner", "admin"],
    requiredFeature: "whatsapp",
  },
  { href: "/dashboard/laporan", label: "Laporan", icon: BarChart3 },
  {
    id: "administrator",
    label: "Administrator",
    icon: Shield,
    children: [
      { href: "/dashboard/staf", label: "Staf", icon: UserCog, roles: ["owner"] },
      {
        href: "/dashboard/kolektor-pelanggan",
        label: "Area Kolektor",
        icon: UserCheck,
        roles: ["owner", "admin"],
      },
      { href: "/dashboard/tiket", label: "Tiket", icon: Ticket },
    ],
  },
  {
    href: "/dashboard/integrasi",
    label: "Integrasi",
    icon: Plug,
    roles: ["owner", "admin"],
  },
  {
    href: "/dashboard/referral",
    label: "Referral",
    icon: UserPlus,
    roles: ["owner", "admin"],
  },
  {
    href: "/dashboard/pengaturan",
    label: "Pengaturan",
    icon: Settings,
    roles: ["owner", "admin"],
  },
  { href: "/dashboard/community", label: "Community", icon: HandCoins },
  { href: "/dashboard/kontributor", label: "Kontributor", icon: Heart },
  {
    href: "/dashboard/langganan",
    label: "Langganan SaaS",
    icon: CreditCard,
    roles: ["owner", "admin"],
  },
];

export const RENEWAL_ONLY_NAV: DashboardNavItem[] = [
  { href: "/dashboard/langganan", label: "Langganan SaaS", icon: CreditCard },
];

export function canSeeDashboardNavItem(
  item: DashboardNavItem,
  userRole: string,
  packageFeatures?: string[]
): boolean {
  if (item.roles && !item.roles.includes(userRole)) return false;
  if (item.requiredFeature && packageFeatures && !packageFeatures.includes(item.requiredFeature)) {
    return false;
  }
  return true;
}

export function filterDashboardNav(
  entries: DashboardNavEntry[],
  userRole: string,
  packageFeatures?: string[]
): DashboardNavEntry[] {
  return entries
    .map((entry) => {
      if (!isDashboardNavGroup(entry)) {
        return canSeeDashboardNavItem(entry, userRole, packageFeatures) ? entry : null;
      }
      const children = entry.children.filter((child) =>
        canSeeDashboardNavItem(child, userRole, packageFeatures)
      );
      if (children.length === 0) return null;
      return { ...entry, children };
    })
    .filter((entry): entry is DashboardNavEntry => entry !== null);
}

export type DashboardMenuItemData = {
  id: string;
  label: string;
  href: string;
  iconKey: DashboardMenuIconKey;
};

export type DashboardMenuSectionData = {
  title: string;
  items: DashboardMenuItemData[];
};

export function buildDashboardMenuSections(entries: DashboardNavEntry[]): DashboardMenuSectionData[] {
  const main: DashboardMenuItemData[] = [];
  const sections: DashboardMenuSectionData[] = [];

  for (const entry of entries) {
    if (!isDashboardNavGroup(entry)) {
      main.push({
        id: entry.href,
        label: entry.label,
        href: entry.href,
        iconKey: dashboardMenuIconKey(entry.href),
      });
      continue;
    }
    sections.push({
      title: entry.label,
      items: entry.children.map((child) => ({
        id: child.href,
        label: child.label,
        href: child.href,
        iconKey: dashboardMenuIconKey(child.href),
      })),
    });
  }

  if (main.length > 0) {
    sections.unshift({ title: "Menu Utama", items: main });
  }

  return sections;
}
