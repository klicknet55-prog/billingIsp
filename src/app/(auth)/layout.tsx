import { Network } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Network className="text-primary" />
          NetManage
        </Link>
        <ThemeSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
    </div>
  );
}
