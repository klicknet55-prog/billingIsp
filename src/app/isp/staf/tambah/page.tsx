import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaffCreateForm } from "@/features/staff/components/staff-create-form";
import { requireUser } from "@/lib/auth";

export default async function TambahStafPage() {
  await requireUser(["owner"]);

  return (
    <>
      <div className="mb-3 md:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10 px-2">
          <Link href="/dashboard/staf">
            <ChevronLeft className="size-5" />
            Kembali
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Tambah Staf"
        description="Buat akun admin, kolektor, atau teknisi untuk ISP Anda."
      />

      <Card>
        <CardContent className="p-4 md:p-5">
          <StaffCreateForm cancelHref="/dashboard/staf" />
        </CardContent>
      </Card>
    </>
  );
}
