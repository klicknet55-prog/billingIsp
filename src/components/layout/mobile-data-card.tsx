import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MobileDataCard({
  title,
  badge,
  badgeVariant = "secondary",
  meta,
  footer,
  className,
}: {
  title: string;
  badge?: string;
  badgeVariant?: "secondary" | "success" | "destructive" | "warning";
  meta: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("md:hidden", className)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-medium leading-snug">{title}</p>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">{meta}</div>
        {footer && <div className="mt-3 flex flex-wrap gap-2">{footer}</div>}
      </CardContent>
    </Card>
  );
}
