"use client";

import { useActionState, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveTenantTemplatesAction } from "@/features/messages/actions";
import { renderTemplate } from "@/features/messages/render";
import { SAMPLE_PELANGGAN_VARS } from "@/features/messages/defaults";
import {
  TENANT_TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  type TenantTemplateKey,
} from "@/features/messages/types";
import { PlaceholderList } from "./placeholder-list";

const initial: ActionState = {};

export function TemplateForm({
  templates,
}: {
  templates: Record<TenantTemplateKey, string>;
}) {
  const [state, action] = useActionState(saveTenantTemplatesAction, initial);
  const { toast } = useToast();
  const [values, setValues] = useState(templates);
  const [activeKey, setActiveKey] = useState<TenantTemplateKey>("invoice_new");

  useEffect(() => {
    if (state.ok) toast({ title: "Template disimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  const preview = renderTemplate(values[activeKey] ?? "", SAMPLE_PELANGGAN_VARS);

  return (
    <form action={action} className="space-y-4">
      {TENANT_TEMPLATE_KEYS.map((key) => (
        <input key={key} type="hidden" name={`template_${key}`} value={values[key] ?? ""} readOnly />
      ))}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Template</Label>
          <div className="space-y-1">
            {TENANT_TEMPLATE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                  activeKey === key ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setActiveKey(key)}
              >
                {TEMPLATE_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label>{TEMPLATE_LABELS[activeKey]}</Label>
          <Textarea
            rows={8}
            value={values[activeKey] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [activeKey]: e.target.value }))}
          />
          <PlaceholderList
            onInsert={(token) =>
              setValues((prev) => ({
                ...prev,
                [activeKey]: `${prev[activeKey] ?? ""}${prev[activeKey] ? " " : ""}${token}`,
              }))
            }
          />
          <div>
            <Label>Preview</Label>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
              {preview}
            </pre>
          </div>
        </div>
      </div>

      <SubmitButton>Simpan Template</SubmitButton>
    </form>
  );
}
