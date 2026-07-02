CREATE TABLE IF NOT EXISTS "push_notification_log" (
  "id" text PRIMARY KEY,
  "tenant_id" text REFERENCES "tenant"("id"),
  "subject_type" text NOT NULL,
  "subject_id" text NOT NULL,
  "app" text NOT NULL,
  "event_type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "token" text NOT NULL,
  "status" text NOT NULL,
  "attempt_count" integer NOT NULL DEFAULT 1,
  "response" text,
  "error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "push_notification_log_tenant_idx"
  ON "push_notification_log" ("tenant_id", "created_at");
