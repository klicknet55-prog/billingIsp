"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestOtpAction,
  verifyOtpAction,
  type ActionState,
} from "@/features/auth/actions";

const initial: ActionState = {};

export function PortalLoginForm() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [reqState, reqAction, reqPending] = useActionState(requestOtpAction, initial);
  const [verState, verAction, verPending] = useActionState(verifyOtpAction, initial);

  useEffect(() => {
    if (reqState.ok) setStep("code");
  }, [reqState.ok]);

  if (step === "phone") {
    return (
      <form action={reqAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Nomor WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812xxxxxxxx"
            required
          />
        </div>
        {reqState.error && <p className="text-sm text-destructive">{reqState.error}</p>}
        <Button type="submit" className="w-full" disabled={reqPending}>
          {reqPending ? "Mengirim..." : "Kirim OTP"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Masukan Nomor WhatsApp Anda untuk mendapatkan Kode OTP.
        </p>
      </form>
    );
  }

  return (
    <form action={verAction} className="space-y-4">
      <input type="hidden" name="phone" value={phone} />
      <div className="space-y-2">
        <Label htmlFor="code">Kode OTP</Label>
        <Input id="code" name="code" inputMode="numeric" placeholder="6 digit" required />
        <p className="text-xs text-muted-foreground">Dikirim ke WhatsApp {phone}.</p>
      </div>
      {verState.error && <p className="text-sm text-destructive">{verState.error}</p>}
      <Button type="submit" className="w-full" disabled={verPending}>
        {verPending ? "Memverifikasi..." : "Masuk"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("phone")}>
        Ganti nomor
      </Button>
    </form>
  );
}
