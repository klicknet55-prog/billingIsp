"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Tombol yang membuka/menutup panel form di bawahnya. */
export function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen((v) => !v)}>
        {open ? <X /> : <Plus />}
        {open ? "Tutup" : label}
      </Button>
      {open && (
        <Card className="mt-4">
          <CardContent className="p-5">{children}</CardContent>
        </Card>
      )}
    </div>
  );
}
