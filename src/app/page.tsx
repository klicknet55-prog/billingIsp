import {
  ArrowRight,
  CreditCard,
  MapPin,
  Network,
  Router,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { SiteBrand } from "@/components/layout/site-brand";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Users, title: "Manajemen Pelanggan", desc: "Data, koordinat, paket, dan jatuh tempo dalam satu tempat." },
  { icon: Router, title: "Kontrol Mikrotik", desc: "Isolasi & aktivasi otomatis via API RouterOS." },
  { icon: CreditCard, title: "Billing Otomatis", desc: "Invoice, pembayaran Duitku, dan rekonsiliasi." },
  { icon: MapPin, title: "Tugas Kolektor", desc: "Daftar tagihan diurutkan berdasarkan jarak." },
  { icon: Ticket, title: "Helpdesk Tiket", desc: "Terima & tetapkan gangguan ke teknisi." },
  { icon: Network, title: "Multi-tenant", desc: "Data tiap ISP terisolasi dan aman." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <SiteBrand />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link href="/portal/login">Portal Pelanggan</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Managemen Billing & Jaringan ISP & RT-RW Net
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
            Kelola pelanggan, billing, perangkat Mikrotik, penagihan lapangan, dan portal
            pelanggan dalam satu platform.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register-tenant">
                Daftar ISP <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Masuk Dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="p-6">
                  <f.icon className="mb-3 text-primary" />
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
