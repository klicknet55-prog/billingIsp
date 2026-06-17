"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  saveTenantDuitkuConfigAction,
  saveTenantWhatsAppConfigAction,
  testTenantWhatsAppConfigAction,
} from "@/features/integrations/actions";

const initial: ActionState = {};

export function DuitkuConfigForm({
  defaults,
}: {
  defaults: {
    merchantCode?: string;
    callbackUrl?: string | null;
    inquiryUrl?: string | null;
    paymentMethod?: string | null;
    isEnabled?: boolean;
    hasApiKey: boolean;
  };
}) {
  const [state, action] = useActionState(saveTenantDuitkuConfigAction, initial);
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: "Konfigurasi Duitku tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Merchant Code</label>
          <input
            name="merchantCode"
            defaultValue={defaults.merchantCode ?? ""}
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
          {fe.merchantCode && <p className="text-xs text-destructive">{fe.merchantCode}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Payment Method</label>
          <input
            name="paymentMethod"
            defaultValue={defaults.paymentMethod ?? "VC"}
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
          {fe.paymentMethod && <p className="text-xs text-destructive">{fe.paymentMethod}</p>}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">API Key</label>
        <input
          name="apiKey"
          placeholder={defaults.hasApiKey ? "Kosongkan jika tidak diubah" : "Masukkan API key"}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Callback URL</label>
        <input
          name="callbackUrl"
          defaultValue={defaults.callbackUrl ?? ""}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.callbackUrl && <p className="text-xs text-destructive">{fe.callbackUrl}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Inquiry URL</label>
        <input
          name="inquiryUrl"
          defaultValue={defaults.inquiryUrl ?? ""}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.inquiryUrl && <p className="text-xs text-destructive">{fe.inquiryUrl}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isEnabled"
          defaultChecked={defaults.isEnabled ?? true}
          className="size-4"
        />
        Aktifkan Duitku untuk tenant ini
      </label>
      <SubmitButton>Simpan Duitku</SubmitButton>
    </form>
  );
}

export function WhatsAppConfigForm({
  defaults,
}: {
  defaults: {
    apiUrl?: string;
    provider?: "gateway" | "waba";
    phoneNumberId?: string | null;
    isEnabled?: boolean;
    hasToken: boolean;
  };
}) {
  const [state, action] = useActionState(saveTenantWhatsAppConfigAction, initial);
  const [testState, testAction] = useActionState(testTenantWhatsAppConfigAction, initial);
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: "Konfigurasi WhatsApp tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);
  useEffect(() => {
    if (testState.ok) toast({ title: "Pesan test terkirim", variant: "success" });
    if (testState.error) toast({ title: testState.error, variant: "error" });
  }, [testState.ok, testState.error, toast]);
  const fe = state.fieldErrors ?? {};
  const testFe = testState.fieldErrors ?? {};

  return (
    <div className="space-y-4">
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Provider</label>
        <select
          name="provider"
          defaultValue={defaults.provider ?? "gateway"}
          className="h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="gateway">Gateway URL (phone/message/secret)</option>
          <option value="waba">WhatsApp Business API (Bearer Token)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Server URL</label>
        <input
          name="apiUrl"
          defaultValue={defaults.apiUrl ?? ""}
          placeholder="https://domain/wa-send.php"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.apiUrl && <p className="text-xs text-destructive">{fe.apiUrl}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Secret / API Token</label>
        <input
          name="apiToken"
          placeholder={defaults.hasToken ? "Kosongkan jika tidak diubah" : "Masukkan secret/token"}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Phone Number ID (opsional)</label>
        <input
          name="phoneNumberId"
          defaultValue={defaults.phoneNumberId ?? ""}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isEnabled"
          defaultChecked={defaults.isEnabled ?? true}
          className="size-4"
        />
        Aktifkan WhatsApp API untuk tenant ini
      </label>
      <SubmitButton>Simpan WhatsApp</SubmitButton>
    </form>
    <form action={testAction} className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Test Kirim WhatsApp</p>
      <div>
        <label className="mb-1 block text-xs font-medium">Nomor tujuan</label>
        <input
          name="phone"
          placeholder="0812xxxxxxx"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {testFe.phone && <p className="text-xs text-destructive">{testFe.phone}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Pesan</label>
        <textarea
          name="message"
          defaultValue="Test pesan dari modul Integrasi NetManage."
          className="min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
        />
        {testFe.message && <p className="text-xs text-destructive">{testFe.message}</p>}
      </div>
      <SubmitButton variant="outline">Kirim Test WA</SubmitButton>
    </form>
    </div>
  );
}

