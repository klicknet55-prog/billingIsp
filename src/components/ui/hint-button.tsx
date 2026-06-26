import { Button, type ButtonProps } from "@/components/ui/button";

/** Disabled buttons ignore pointer events — wrap with title on span for native tooltip. */
export function HintButton({
  hint,
  disabled,
  className,
  ...props
}: ButtonProps & { hint?: string }) {
  const button = <Button disabled={disabled} className={className} {...props} />;
  if (disabled && hint) {
    return (
      <span title={hint} className="inline-flex">
        {button}
      </span>
    );
  }
  return button;
}
