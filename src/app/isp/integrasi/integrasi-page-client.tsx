"use client";

import { useState } from "react";
import { TunnelhostServiceLinks } from "@/components/integrations/tunnelhost-service-links";
import { QueryTabNav } from "@/components/ui/query-tab-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GowaEnvDefaults } from "@/lib/integrations/whatsapp/config";
import type { WebhookEvent } from "@/lib/db/schema";
import { DuitkuConfigForm, WhatsAppConfigForm } from "./integration-forms";
import { ApiKeysPanel } from "./api-keys-panel";
import { WebhookConfigPanel } from "./webhook-config-panel";

const TABS = [
  { id: "duitku", label: "Duitku" },
  { id: "whatsapp", label: "WhatsApp API" },
  { id: "api", label: "REST API Key" },
  { id: "webhook", label: "Webhook Keluar" },
] as const;

type IntegrasiTabId = (typeof TABS)[number]["id"];

type ApiKeyRow = {
  id: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

type WebhookDelivery = {
  id: string;
  event: string;
  success: boolean;
  statusCode: number | null;
  error: string | null;
  durationMs: number | null;
  createdAt: Date;
};

export function IntegrasiPageClient({
  initialTab,
  duitku,
  wa,
  gowaEnv,
  deviceIdPrefix,
  apiKeys,
  appUrl,
  webhook,
  deliveries,
  circuitOpen,
  apiRateLimit,
  webhookMaxFailures,
}: {
  initialTab: string;
  duitku: {
    merchantCode?: string;
    callbackUrl?: string | null;
    inquiryUrl?: string | null;
    paymentMethod?: string | null;
    isEnabled?: boolean;
    hasApiKey: boolean;
  };
  wa: {
    apiUrl?: string;
    provider?: "gateway" | "waba" | "klicknet";
    phoneNumberId?: string | null;
    deviceId?: string | null;
    basicAuthUser?: string | null;
    isEnabled?: boolean;
    hasToken: boolean;
  };
  gowaEnv: GowaEnvDefaults;
  deviceIdPrefix: string;
  apiKeys: ApiKeyRow[];
  appUrl: string;
  webhook: {
    url?: string;
    events: WebhookEvent[];
    isEnabled: boolean;
    hasSecret: boolean;
    failureCount: number;
    lastDeliveryAt: Date | null;
  };
  deliveries: WebhookDelivery[];
  circuitOpen: boolean;
  apiRateLimit: string;
  webhookMaxFailures: number;
}) {
  const validTab = TABS.some((t) => t.id === initialTab) ? initialTab : "duitku";
  const [tab, setTab] = useState<IntegrasiTabId>(validTab as IntegrasiTabId);

  return (
    <>
      <QueryTabNav
        tabs={TABS}
        active={tab}
        basePath="/dashboard/integrasi"
        paramKey="tab"
        defaultTabId="duitku"
        mode="client"
        onTabChange={(id) => setTab(id as IntegrasiTabId)}
      />

      {tab === "duitku" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Duitku</CardTitle>
            <CardDescription>
              Digunakan untuk pembayaran invoice pelanggan dan langganan tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DuitkuConfigForm defaults={duitku} />
          </CardContent>
        </Card>
      )}

      {tab === "whatsapp" && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>WhatsApp API</CardTitle>
              <CardDescription>
                Digunakan untuk OTP login pelanggan dan notifikasi otomatis.
              </CardDescription>
            </div>
            <TunnelhostServiceLinks className="shrink-0" showVpn={false} />
          </CardHeader>
          <CardContent>
            <WhatsAppConfigForm
              gowaEnv={gowaEnv}
              deviceIdPrefix={deviceIdPrefix}
              defaults={wa}
            />
          </CardContent>
        </Card>
      )}

      {tab === "api" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>REST API Key</CardTitle>
            <CardDescription>
              Akses read-only ke data tenant via Bearer token. Rate limit {apiRateLimit} req/menit
              per key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeysPanel keys={apiKeys} appUrl={appUrl} />
          </CardContent>
        </Card>
      )}

      {tab === "webhook" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Webhook Keluar</CardTitle>
            <CardDescription>
              Terima notifikasi real-time saat tagihan lunas atau pelanggan diisolir. Circuit
              breaker setelah {webhookMaxFailures} kegagalan berturut-turut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookConfigPanel
              defaults={webhook}
              deliveries={deliveries}
              circuitOpen={circuitOpen}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
