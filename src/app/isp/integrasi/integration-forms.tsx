"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  saveTenantDuitkuConfigAction,
  saveTenantWhatsAppConfigAction,
  savePlatformWhatsAppConfigAction,
  testTenantWhatsAppConfigAction,
  testPlatformWhatsAppConfigAction,
  loginKlicknetDeviceAction,
  loginPlatformKlicknetDeviceAction,
  logoutKlicknetDeviceAction,
  logoutPlatformKlicknetDeviceAction,
  reconnectKlicknetDeviceAction,
  reconnectPlatformKlicknetDeviceAction,
} from "@/features/integrations/actions";
import type { GowaEnvDefaults } from "@/lib/integrations/whatsapp/config";
import { klicknetDeviceSuffix } from "@/lib/integrations/whatsapp/config";

const initial: ActionState = {};
type KlicknetDeviceState = ActionState & {
  deviceId?: string;
  qrLink?: string;
  pairCode?: string;
  loginMode?: "qr" | "code";
};
const deviceInitial: KlicknetDeviceState = {};

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
          placeholder="https://domain-anda.com/api/webhook/duitku"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Webhook server (POST). Return URL browser otomatis: origin yang sama + /bayar/selesai
        </p>
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
  scope = "tenant",
  gowaEnv = { baseUrl: "", basicUser: "", hasBasicPassword: false },
  deviceIdPrefix = "tenant",
}: {
  scope?: "tenant" | "platform";
  /** Kredensial GOWA dari .env — admin tidak perlu isi URL/Basic Auth manual. */
  gowaEnv?: GowaEnvDefaults;
  /** Prefix otomatis device ID di server GOWA (domain tenant atau `platform`). */
  deviceIdPrefix?: string;
  defaults: {
    apiUrl?: string;
    provider?: "gateway" | "waba" | "klicknet";
    phoneNumberId?: string | null;
    deviceId?: string | null;
    basicAuthUser?: string | null;
    isEnabled?: boolean;
    hasToken: boolean;
  };
}) {
  const saveAction = scope === "platform" ? savePlatformWhatsAppConfigAction : saveTenantWhatsAppConfigAction;
  const loginActionFn = scope === "platform" ? loginPlatformKlicknetDeviceAction : loginKlicknetDeviceAction;
  const logoutActionFn = scope === "platform" ? logoutPlatformKlicknetDeviceAction : logoutKlicknetDeviceAction;
  const reconnectActionFn =
    scope === "platform" ? reconnectPlatformKlicknetDeviceAction : reconnectKlicknetDeviceAction;
  const testActionFn = scope === "platform" ? testPlatformWhatsAppConfigAction : testTenantWhatsAppConfigAction;
  const [provider, setProvider] = useState<"gateway" | "waba" | "klicknet">(
    defaults.provider ?? (gowaEnv.baseUrl ? "klicknet" : "waba")
  );
  const lockedGowaUrl = provider === "klicknet" && gowaEnv.baseUrl.length > 0;
  const lockedGowaAuth =
    provider === "klicknet" &&
    gowaEnv.basicUser.length > 0 &&
    gowaEnv.hasBasicPassword;
  const [loginMode, setLoginMode] = useState<"qr" | "code">("qr");
  const router = useRouter();
  const [state, action] = useActionState(saveAction, initial);
  const [loginState, loginAction] = useActionState(loginActionFn, deviceInitial);
  const [logoutState, logoutAction] = useActionState(logoutActionFn, initial);
  const [reconnectState, reconnectAction] = useActionState(reconnectActionFn, initial);
  const [testState, testAction] = useActionState(testActionFn, initial);
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) {
      toast({ title: "Konfigurasi WhatsApp tersimpan", variant: "success" });
      router.refresh();
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast, router, provider]);
  useEffect(() => {
    if (loginState.ok) {
      toast({
        title:
          loginState.loginMode === "code"
            ? "Kode pairing siap — masukkan di WhatsApp"
            : "Scan QR untuk login WhatsApp",
        variant: "success",
      });
    }
    if (loginState.error) toast({ title: loginState.error, variant: "error" });
  }, [loginState.ok, loginState.error, loginState.loginMode, toast]);
  useEffect(() => {
    if (logoutState.ok) {
      toast({ title: "Device di-logout dan dihapus", variant: "success" });
      router.refresh();
    }
    if (logoutState.error) toast({ title: logoutState.error, variant: "error" });
  }, [logoutState.ok, logoutState.error, toast, router]);
  useEffect(() => {
    if (reconnectState.ok) toast({ title: "Reconnect berhasil", variant: "success" });
    if (reconnectState.error) toast({ title: reconnectState.error, variant: "error" });
  }, [reconnectState.ok, reconnectState.error, toast]);
  useEffect(() => {
    if (testState.ok) toast({ title: "Pesan test terkirim", variant: "success" });
    if (testState.error) toast({ title: testState.error, variant: "error" });
  }, [testState.ok, testState.error, toast]);
  const fe = state.fieldErrors ?? {};
  const testFe = testState.fieldErrors ?? {};

  const enableLabel =
    scope === "platform"
      ? "Aktifkan WhatsApp untuk platform"
      : "Aktifkan WhatsApp untuk tenant ini";

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Tipe Provider</label>
          <select
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
            className="h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="klicknet">Klicknet / GOWA (scan QR)</option>
            <option value="waba">WhatsApp Business API (WABA)</option>
            <option value="gateway">Gateway URL (legacy)</option>
          </select>
        </div>

        {provider === "klicknet" && (
          <>
            {lockedGowaUrl && lockedGowaAuth ? (
              <>
                <input type="hidden" name="apiUrl" value={gowaEnv.baseUrl} />
                <input type="hidden" name="basicAuthUser" value={gowaEnv.basicUser} />
              </>
            ) : (
              <>
                {lockedGowaUrl ? (
                  <input type="hidden" name="apiUrl" value={gowaEnv.baseUrl} />
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Server URL GOWA</label>
                    <input
                      name="apiUrl"
                      defaultValue={defaults.apiUrl ?? ""}
                      placeholder="https://wa.tunnelhost.my.id"
                      className="h-9 w-full rounded-md border px-3 text-sm"
                    />
                    {fe.apiUrl && <p className="text-xs text-destructive">{fe.apiUrl}</p>}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Username Basic Auth</label>
                  <input
                    name="basicAuthUser"
                    defaultValue={defaults.basicAuthUser ?? gowaEnv.basicUser}
                    placeholder="admin"
                    readOnly={lockedGowaAuth && gowaEnv.basicUser.length > 0}
                    className="h-9 w-full rounded-md border px-3 text-sm"
                  />
                  {fe.basicAuthUser && <p className="text-xs text-destructive">{fe.basicAuthUser}</p>}
                </div>
                {!lockedGowaAuth && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Password Basic Auth</label>
                    <input
                      name="apiToken"
                      type="password"
                      placeholder={defaults.hasToken ? "Kosongkan jika tidak diubah" : "Password GOWA"}
                      className="h-9 w-full rounded-md border px-3 text-sm"
                    />
                  </div>
                )}
              </>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Nama device</label>
              <div className="flex items-center gap-1">
                <span className="shrink-0 rounded-md border bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">
                  {deviceIdPrefix}-
                </span>
                <input
                  name="deviceName"
                  placeholder="billing"
                  defaultValue={
                    defaults.deviceId
                      ? klicknetDeviceSuffix(defaults.deviceId, deviceIdPrefix)
                      : "billing"
                  }
                  className="h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
                />
              </div>
              {defaults.deviceId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Device terdaftar: <span className="font-mono">{defaults.deviceId}</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Simpan akan mendaftarkan device ke server GOWA.
                </p>
              )}
            </div>
          </>
        )}

        {provider === "waba" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Graph API URL</label>
              <input
                name="apiUrl"
                defaultValue={defaults.apiUrl ?? "https://graph.facebook.com/v21.0"}
                placeholder="https://graph.facebook.com/v21.0"
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
              {fe.apiUrl && <p className="text-xs text-destructive">{fe.apiUrl}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Access Token</label>
              <input
                name="apiToken"
                type="password"
                placeholder={defaults.hasToken ? "Kosongkan jika tidak diubah" : "Bearer token WABA"}
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number ID</label>
              <input
                name="phoneNumberId"
                defaultValue={defaults.phoneNumberId ?? ""}
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
            </div>
          </>
        )}

        {provider === "gateway" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Gateway URL</label>
              <input
                name="apiUrl"
                defaultValue={defaults.apiUrl ?? ""}
                placeholder="https://gateway.example.com/send"
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
              {fe.apiUrl && <p className="text-xs text-destructive">{fe.apiUrl}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Secret / Token</label>
              <input
                name="apiToken"
                type="password"
                placeholder={defaults.hasToken ? "Kosongkan jika tidak diubah" : "Secret gateway"}
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
            </div>
          </>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={defaults.isEnabled ?? true}
            className="size-4"
          />
          {enableLabel}
        </label>
        <SubmitButton>Simpan WhatsApp</SubmitButton>
      </form>

      {provider === "klicknet" && (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">Sesi WhatsApp</p>

          <form action={loginAction} className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Mode login</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLoginMode("qr")}
                  className={`min-h-9 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    loginMode === "qr"
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("code")}
                  className={`min-h-9 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    loginMode === "code"
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  Kode Pairing
                </button>
              </div>
              <input type="hidden" name="loginMode" value={loginMode} readOnly />
            </div>

            {loginMode === "code" && (
              <div>
                <label className="mb-1 block text-xs font-medium">Nomor WhatsApp</label>
                <input
                  name="loginPhone"
                  placeholder="62812xxxxxxx"
                  className="h-9 w-full rounded-md border px-3 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Nomor yang dipakai login WhatsApp (format 62…).
                </p>
              </div>
            )}

            <SubmitButton variant="outline">Login</SubmitButton>
          </form>

          <div className="flex flex-wrap gap-2">
            <form action={reconnectAction}>
              <SubmitButton variant="outline">Reconnect</SubmitButton>
            </form>
            <form action={logoutAction}>
              <SubmitButton variant="outline">Logout</SubmitButton>
            </form>
          </div>

          {typeof loginState.deviceId === "string" && loginState.deviceId.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Device: <span className="font-mono">{loginState.deviceId}</span>
            </p>
          ) : null}

          {typeof loginState.qrLink === "string" && loginState.qrLink.length > 0 ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loginState.qrLink} alt="QR WhatsApp" className="mx-auto max-w-[220px]" />
              <p className="text-center text-xs text-muted-foreground">
                WhatsApp → Pengaturan → Perangkat Tertaut → Tautkan perangkat → Scan QR
              </p>
            </div>
          ) : null}

          {typeof loginState.pairCode === "string" && loginState.pairCode.length > 0 ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Kode pairing</p>
              <p className="font-mono text-2xl font-bold tracking-widest">{loginState.pairCode}</p>
              <p className="text-xs text-muted-foreground">
                WhatsApp → Perangkat Tertaut → Tautkan perangkat → Tautkan dengan nomor telepon
              </p>
            </div>
          ) : null}
        </div>
      )}

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

