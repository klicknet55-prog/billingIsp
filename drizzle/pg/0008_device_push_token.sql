CREATE TABLE IF NOT EXISTS "device_push_token" (
  "id" text PRIMARY KEY,
  "tenant_id" text REFERENCES "tenant"("id"),
  "subject_type" text NOT NULL,
  "subject_id" text NOT NULL,
  "app" text NOT NULL,
  "platform" text NOT NULL DEFAULT 'android',
  "token" text NOT NULL UNIQUE,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "device_push_token_subject_idx"
  ON "device_push_token" ("tenant_id", "subject_type", "subject_id", "app");
