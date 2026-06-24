"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { resetStaffPasswordAction } from "@/features/staff/actions";

const initial: ActionState = {};

function ResetForm({ staffId, staffName, close }: { staffId: string; staffName: string; close: () => void }) {
  const [state, action] = useActionState(resetStaffPasswordAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Kata sandi staf direset", variant: "success" });
      close();
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast, close]);

  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={staffId} />
      <p className="text-sm text-muted-foreground">
        Set kata sandi baru untuk <strong>{staffName}</strong>.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Kata sandi baru</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
        {fe.password && <p className="text-xs text-destructive">{fe.password}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          Batal
        </Button>
        <SubmitButton>Reset Kata Sandi</SubmitButton>
      </div>
    </form>
  );
}

export function StaffResetPasswordDialog({
  staffId,
  staffName,
  trigger,
}: {
  staffId: string;
  staffName: string;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog trigger={trigger} title="Reset Kata Sandi Staf">
      {(close) => <ResetForm staffId={staffId} staffName={staffName} close={close} />}
    </Dialog>
  );
}
