"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createComplaintAction } from "@/features/portal/actions";
import { compressImageFileForUpload, formatFileSize } from "@/lib/image/compress-client";

export function PortalComplaintForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [compressing, setCompressing] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) {
      setPhotoFile(null);
      setPhotoNote("");
      return;
    }

    setCompressing(true);
    setPhotoNote("");
    try {
      const compressed = await compressImageFileForUpload(raw);
      setPhotoFile(compressed);
      if (compressed.size < raw.size) {
        setPhotoNote(
          `Dikompres: ${formatFileSize(raw.size)} → ${formatFileSize(compressed.size)}`
        );
      } else {
        setPhotoNote(`Ukuran: ${formatFileSize(compressed.size)}`);
      }
    } catch {
      setPhotoFile(raw);
      setPhotoNote(`Ukuran: ${formatFileSize(raw.size)}`);
    } finally {
      setCompressing(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (photoFile) {
      fd.set("foto", photoFile);
    } else {
      fd.delete("foto");
    }

    startTransition(async () => {
      try {
        await createComplaintAction(fd);
        form.reset();
        setPhotoFile(null);
        setPhotoNote("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="judul">Judul</Label>
        <Input id="judul" name="judul" required placeholder="Internet lambat" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deskripsi">Deskripsi</Label>
        <Textarea id="deskripsi" name="deskripsi" placeholder="Jelaskan kondisi..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="foto">Foto kondisi (opsional)</Label>
        <Input
          ref={fileInputRef}
          id="foto"
          name="foto"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={compressing || pending}
          onChange={handlePhotoChange}
        />
        <p className="text-xs text-muted-foreground">
          Pilih dari galeri. Foto besar dikompres otomatis (maks. 5 MB).
        </p>
        {compressing && (
          <p className="text-xs text-muted-foreground">Mengompres foto...</p>
        )}
        {photoNote && !compressing && (
          <p className="text-xs text-muted-foreground">{photoNote}</p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending || compressing}>
        {pending ? "Mengirim..." : "Kirim Laporan"}
      </Button>
    </form>
  );
}
