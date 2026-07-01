"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveStaffAction } from "@/features/staff/actions";

const initial: ActionState = {};

export function StaffCreateForm({
  cancelHref,
  onCancel,
}: {
  cancelHref?: string;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(saveStaffAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Staf berhasil ditambahkan", variant: "success" });
      if (onCancel) {
        onCancel();
      } else {
        router.push("/dashboard/staf");
        router.refresh();
      }
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast, router, onCancel]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" required />
        {fe.nama && <p className="text-xs text-destructive">{fe.nama}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        {fe.email && <p className="text-xs text-destructive">{fe.email}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Peran</Label>
          <Select id="role" name="role" defaultValue="admin" className="w-full min-w-0">
            <option value="admin">Admin</option>
            <option value="kolektor">Kolektor</option>
            <option value="teknisi">Teknisi</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">No. HP</Label>
          <Input id="phone" name="phone" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input id="password" name="password" type="password" placeholder="Minimal 6 karakter" required />
        {fe.password && <p className="text-xs text-destructive">{fe.password}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Button asChild type="button" variant="ghost" className="min-h-11">
            <Link href={cancelHref}>Batal</Link>
          </Button>
        ) : onCancel ? (
          <Button type="button" variant="ghost" className="min-h-11" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
        <SubmitButton className="min-h-11">Simpan Staf</SubmitButton>
      </div>
    </form>
  );
}
