ALTER TABLE "tenant" ADD COLUMN "billing_reminder_days" integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "billing_first_invoice_days" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "billing_generate_days" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "billing_isolation_days" integer DEFAULT 7 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "billing_dunning_step2_days" integer DEFAULT 3 NOT NULL;
