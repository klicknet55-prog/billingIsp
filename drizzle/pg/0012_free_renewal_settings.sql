ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "free_renewal_donation_min" integer DEFAULT 10000 NOT NULL;

ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "free_renewal_extension_days" integer DEFAULT 30 NOT NULL;
