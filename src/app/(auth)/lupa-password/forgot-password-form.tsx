"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  if (state.ok) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Jika email terdaftar, tautan reset kata sandi telah dikirim ke email (dan WhatsApp jika
          nomor HP diisi di profil).
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Kembali ke login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email akun ISP</Label>
        <Input id="email" name="email" type="email" required placeholder="owner@isp.net" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Mengirim..." : "Kirim Tautan Reset"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link href="/login">Batal</Link>
      </Button>
    </form>
  );
}
