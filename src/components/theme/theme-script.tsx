/**
 * Script anti-flash tema — di-inline di `<head>` root layout sebelum paint.
 * Jika DEFAULT_PRESET berubah, update juga string di bawah.
 */
export { DEFAULT_PRESET } from "@/lib/theme/presets";

export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("nm-theme-preset")||"rose";var m=localStorage.getItem("nm-theme-mode")||"dark";document.documentElement.dataset.theme=p;if(m==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;
