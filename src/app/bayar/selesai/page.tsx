import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  confirmCommunityDonationFromReturn,
  resolveKontributorPath,
} from "@/features/community-donation/service";
import { confirmFreeRenewalFromReturn } from "@/features/saas-renewal/service";

function nextStep(orderId: string, returnTo?: string) {
  if (orderId.startsWith("SUB-")) {
    return {
      title: "Pembayaran langganan",
      message:
        "Pembayaran berhasil. Akun ISP Anda akan diaktifkan dalam beberapa saat. Silakan masuk ke dashboard.",
      href: "/login",
      label: "Masuk ke dashboard",
    };
  }
  if (orderId.startsWith("SUP-")) {
    return {
      title: "Upgrade paket",
      message:
        "Pembayaran berhasil. Paket berlangganan akan diperbarui dalam beberapa saat.",
      href: "/dashboard/langganan?ok=1",
      label: "Lihat langganan",
    };
  }
  if (orderId.startsWith("INV-")) {
    return {
      title: "Pembayaran invoice",
      message: "Pembayaran berhasil. Status invoice akan diperbarui segera.",
      href: "/portal",
      label: "Kembali ke portal",
    };
  }
  if (orderId.startsWith("DON-")) {
    return {
      title: "Donasi komunitas",
      message: "Terima kasih atas donasi Anda. Nama Anda tercatat di halaman Kontributor.",
      href: `${resolveKontributorPath(returnTo)}?ok=1`,
      label: "Lihat kontributor",
    };
  }
  if (orderId.startsWith("REN-")) {
    return {
      title: "Perpanjang paket Free",
      message: "Donasi berhasil. Masa langganan paket Free Anda diperpanjang.",
      href: "/dashboard/langganan?ok=1",
      label: "Lihat langganan",
    };
  }
  return {
    title: "Pembayaran",
    message: "Terima kasih. Pembayaran Anda telah diproses.",
    href: "/",
    label: "Kembali ke beranda",
  };
}

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    merchantOrderId?: string;
    resultCode?: string;
    reference?: string;
    paymentCode?: string;
    returnTo?: string;
  }>;
}) {
  const qs = await searchParams;
  const orderId = qs.merchantOrderId ?? "";
  const reference = qs.reference ?? "";
  const success = qs.resultCode === "00";
  const step = nextStep(orderId, qs.returnTo);

  if (orderId.startsWith("DON-")) {
    await confirmCommunityDonationFromReturn(orderId, qs.resultCode, qs.paymentCode);
  }
  if (orderId.startsWith("REN-")) {
    await confirmFreeRenewalFromReturn(orderId, qs.resultCode, qs.paymentCode);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {success ? (
            <CheckCircle2 className="mx-auto mb-2 size-12 text-primary" />
          ) : (
            <XCircle className="mx-auto mb-2 size-12 text-destructive" />
          )}
          <CardTitle>{success ? step.title : "Pembayaran gagal"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm">
          <p className="text-muted-foreground">
            {success
              ? step.message
              : "Pembayaran tidak berhasil atau dibatalkan. Silakan coba lagi."}
          </p>
          {orderId && (
            <p className="text-xs text-muted-foreground">
              Order: <span className="font-mono">{orderId}</span>
              {reference ? (
                <>
                  {" "}
                  · Ref: <span className="font-mono">{reference}</span>
                </>
              ) : null}
            </p>
          )}
          <Button asChild className="w-full">
            <Link href={success ? step.href : "/"}>
              {success ? step.label : "Kembali ke beranda"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
