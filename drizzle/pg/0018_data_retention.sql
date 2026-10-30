CREATE TABLE "sales_commission_retention_summary" (
	"sales_user_id" text PRIMARY KEY NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_commission_retention_summary_sales_user_id_user_id_fk"
		FOREIGN KEY ("sales_user_id") REFERENCES "user"("id")
);
--> statement-breakpoint
CREATE TABLE "data_retention_run" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"period" text NOT NULL,
	"notification_status" text DEFAULT 'pending' NOT NULL,
	"notification_sent_at" timestamp with time zone,
	"purge_status" text DEFAULT 'pending' NOT NULL,
	"archive_path" text,
	"deleted_counts" jsonb,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_retention_run_tenant_id_tenant_id_fk"
		FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "data_retention_run_tenant_period_unique"
	ON "data_retention_run" USING btree ("tenant_id", "period");
--> statement-breakpoint
CREATE INDEX "data_retention_run_period_status_idx"
	ON "data_retention_run" USING btree ("period", "purge_status");
