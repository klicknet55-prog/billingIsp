import Script from "next/script";
import { DEFAULT_PRESET } from "@/lib/theme/presets";

const PRESET_KEY = "nm-theme-preset";
const MODE_KEY = "nm-theme-mode";

/** Script anti-flash tema — server component agar dieksekusi di `<head>`. */
export function ThemeScript() {
  const code = `(function(){try{var p=localStorage.getItem('${PRESET_KEY}')||'${DEFAULT_PRESET}';var m=localStorage.getItem('${MODE_KEY}')||'light';document.documentElement.dataset.theme=p;if(m==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
  return <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: code }} />;
}
