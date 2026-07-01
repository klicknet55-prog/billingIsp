import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTicketAction } from "@/features/tickets/actions";
import { listPelanggan } from "@/features/customers/service";
import { requireUser } from "@/lib/auth";

export default async function TambahTiketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const pelanggan = await listPelanggan(user.tenantId!);

  return (
    <>
      <div className="mb-3 md:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10 px-2">
          <Link href="/dashboard/tiket">
            <ChevronLeft className="size-5" />
            Kembali
          </Link>
        </Button>
      </div>

      <PageHeader title="Buat Tiket" />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 md:p-5">
          <form action={createTicketAction} className="space-y-4">
            <input type="hidden" name="fromPage" value="tambah" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pelangganId">Pelanggan</Label>
                <Select id="pelangganId" name="pelangganId" required className="w-full min-w-0">
                  <option value="">— Pilih pelanggan —</option>
                  {pelanggan.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="judul">Judul</Label>
                <Input id="judul" name="judul" required placeholder="Internet mati" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea id="deskripsi" name="deskripsi" rows={4} placeholder="Jelaskan keluhan..." />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button asChild type="button" variant="ghost" className="min-h-11">
                <Link href="/dashboard/tiket">Batal</Link>
              </Button>
              <Button type="submit" className="min-h-11">
                Simpan Tiket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
