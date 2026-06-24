"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginStaffAction, type ActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginStaffAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="owner@isp.net" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="text-right">
        <Link href="/lupa-password" className="text-xs text-primary hover:underline">
          Lupa kata sandi?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
