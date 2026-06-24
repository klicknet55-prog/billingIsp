import { Pencil, Plus, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteStaffAction,
  setStaffActiveAction,
} from "@/features/staff/actions";
import { listStaff } from "@/features/staff/service";
import { requireUser } from "@/lib/auth";
import { StaffFormDialog } from "./staff-form";
import { StaffResetPasswordDialog } from "./staff-reset-password-dialog";

export default async function StafPage() {
  const owner = await requireUser(["owner"]);
  const staff = await listStaff(owner.tenantId!);

  return (
    <>
      <PageHeader
        title="Manajemen Staf"
        description="Kelola akun admin, kolektor, dan teknisi."
        action={
          <StaffFormDialog
            trigger={
              <Button>
                <Plus /> Tambah Staf
              </Button>
            }
          />
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell className="capitalize">{s.role}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "success" : "secondary"}>
                      {s.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <StaffFormDialog
                        staff={s}
                        trigger={
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      {s.role !== "owner" && (
                        <StaffResetPasswordDialog
                          staffId={s.id}
                          staffName={s.nama}
                          trigger={
                            <Button variant="ghost" size="icon" title="Reset kata sandi">
                              <KeyRound />
                            </Button>
                          }
                        />
                      )}
                      {s.role !== "owner" && (
                        <>
                          <form action={setStaffActiveAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="isActive" value={String(!s.isActive)} />
                            <Button variant="outline" size="sm" type="submit">
                              {s.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                          </form>
                          <form action={deleteStaffAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <Button variant="ghost" size="sm" type="submit">
                              Hapus
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada staf.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
