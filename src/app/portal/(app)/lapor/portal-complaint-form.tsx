"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createComplaintAction } from "@/features/portal/actions";

export function PortalComplaintForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      try {
        await createComplaintAction(fd);
        form.reset();
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
        <Input id="foto" name="foto" type="file" accept="image/*" capture="environment" />
        <p className="text-xs text-muted-foreground">Maks. 5 MB — PNG, JPG, WEBP, atau GIF.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Mengirim..." : "Kirim Laporan"}
      </Button>
    </form>
  );
}
