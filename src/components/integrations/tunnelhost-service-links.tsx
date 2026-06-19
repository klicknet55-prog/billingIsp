import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TUNNELHOST_LINKS } from "@/lib/tunnelhost-links";
import { cn } from "@/lib/utils";

export function TunnelhostServiceLinks({
  className,
  showWa = true,
  showVpn = true,
}: {
  className?: string;
  showWa?: boolean;
  showVpn?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      {showWa && (
        <Button asChild variant="outline" size="sm">
          <a
            href={TUNNELHOST_LINKS.waGatewayRegister}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register WA Gateway
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      )}
      {showVpn && (
        <Button asChild variant="outline" size="sm">
          <a
            href={TUNNELHOST_LINKS.mikrotikVpnRestRegister}
            target="_blank"
            rel="noopener noreferrer"
          >
            VPN REST API Mikrotik
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      )}
    </div>
  );
}
