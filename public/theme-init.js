/** Anti-flash tema — di-load dari `<head>` sebelum paint (lihat `app/layout.tsx`). */
(function () {
  try {
    var p = localStorage.getItem("nm-theme-preset") || "default";
    var m = localStorage.getItem("nm-theme-mode") || "light";
    document.documentElement.dataset.theme = p;
    if (m === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
