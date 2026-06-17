import { DiagnosticClient } from "./diagnostic-client";

export default function DiagnostikPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Diagnostik Koneksi</h1>
        <p className="text-sm text-muted-foreground">Cek latensi dan estimasi kecepatan.</p>
      </div>
      <DiagnosticClient />
    </div>
  );
}
