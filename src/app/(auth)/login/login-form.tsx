"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { loginStaffAction, type ActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getNetManageApp } from "@/lib/mobile/use-mobile-shell";

const initial: ActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginStaffAction, initial);
  const [nmApp, setNmApp] = useState("");

  useEffect(() => {
    setNmApp(getNetManageApp() ?? "");
  }, []);

  return (
    <form action={action} className="space-y-4">
      {nmApp ? <input type="hidden" name="nm_app" value={nmApp} readOnly /> : null}
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
