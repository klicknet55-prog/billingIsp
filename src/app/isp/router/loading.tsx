import { Card, CardContent } from "@/components/ui/card";

export default function RouterLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-muted" />
          <div className="h-4 w-64 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-36 rounded-md bg-muted" />
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded-md bg-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
