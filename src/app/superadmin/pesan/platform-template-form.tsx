"use client";

import { useActionState, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { savePlatformTemplatesAction } from "@/features/messages/actions";
import { renderTemplate } from "@/features/messages/render";
import { SAMPLE_TENANT_VARS } from "@/features/messages/defaults";
import {
  PLATFORM_TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  type PlatformTemplateKey,
} from "@/features/messages/types";
import { TenantPlaceholderList } from "./tenant-placeholder-list";

const initial: ActionState = {};

export function PlatformTemplateForm({
  templates,
}: {
  templates: Record<PlatformTemplateKey, string>;
}) {
  const [state, action] = useActionState(savePlatformTemplatesAction, initial);
  const { toast } = useToast();
  const [values, setValues] = useState(templates);
  const [activeKey, setActiveKey] = useState<PlatformTemplateKey>("saas_reminder_7d");

  useEffect(() => {
    if (state.ok) toast({ title: "Template platform disimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  const preview = renderTemplate(values[activeKey] ?? "", SAMPLE_TENANT_VARS);

  return (
    <form action={action} className="space-y-4">
      {PLATFORM_TEMPLATE_KEYS.map((key) => (
        <input key={key} type="hidden" name={`template_${key}`} value={values[key] ?? ""} readOnly />
      ))}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1">
          {PLATFORM_TEMPLATE_KEYS.map((key) => (
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
        <div className="space-y-2 lg:col-span-2">
          <Label>{TEMPLATE_LABELS[activeKey]}</Label>
          <Textarea
            rows={8}
            value={values[activeKey] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [activeKey]: e.target.value }))}
          />
          <TenantPlaceholderList
            onInsert={(token) =>
              setValues((prev) => ({
                ...prev,
                [activeKey]: `${prev[activeKey] ?? ""}${prev[activeKey] ? " " : ""}${token}`,
              }))
            }
          />
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
            {preview}
          </pre>
        </div>
      </div>
      <SubmitButton>Simpan Template</SubmitButton>
    </form>
  );
}
