import { cn } from "@/lib/utils";

export function StaticPageBody({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base",
        className
      )}
    >
      {content}
    </div>
  );
}
