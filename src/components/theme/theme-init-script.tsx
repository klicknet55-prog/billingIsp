import Script from "next/script";
import { THEME_INIT_SCRIPT } from "./theme-script";

/** Anti-flash tema — harus di root layout, strategy beforeInteractive. */
export function ThemeInitScript() {
  return (
    <Script
      id="nm-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
