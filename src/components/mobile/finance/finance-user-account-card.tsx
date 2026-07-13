import Link from "next/link";

export type FinanceUserSubscriptionInfo = {
  packageName: string;
  status: "active" | "expired";
  expiresAt: string;
};

export function FinanceUserAccountCard({
  userName,
  userRole,
  subscriptionInfo,
  showSubscriptionActions,
}: {
  userName: string;
  userRole: string;
  subscriptionInfo?: FinanceUserSubscriptionInfo | null;
  showSubscriptionActions?: boolean;
}) {
  return (
    <div className="fm-surface-card bg-card p-4 text-foreground">
      <p className="font-semibold">{userName}</p>
      <p className="text-xs capitalize text-muted-foreground">{userRole}</p>
      {subscriptionInfo && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
          <p className="font-medium text-muted-foreground">Paket SaaS</p>
          <p className="mt-0.5 font-medium">{subscriptionInfo.packageName}</p>
          <p className="text-muted-foreground">
            {subscriptionInfo.status === "active" ? "Aktif" : "Expired"} · {subscriptionInfo.expiresAt}
          </p>
        </div>
      )}
      {showSubscriptionActions && (
        <div className="mt-3 grid gap-2">
          <Link
            href="/dashboard/langganan"
            className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
          >
            Kelola langganan
          </Link>
          <Link
            href="/dashboard/referral"
            className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-medium"
          >
            Program referral
          </Link>
        </div>
      )}
    </div>
  );
}
