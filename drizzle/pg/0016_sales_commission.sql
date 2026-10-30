ALTER TABLE "payment_gateway_log" ADD COLUMN "sales_user_id" text REFERENCES "user"("id");
--> statement-breakpoint
ALTER TABLE "payment_gateway_log" ADD COLUMN "commission_rate_bps" integer;
--> statement-breakpoint
CREATE TABLE "sales_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"referral_code" text NOT NULL,
	"commission_rate_bps" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_profile_referral_code_unique" ON "sales_profile" USING btree ("referral_code");
--> statement-breakpoint
CREATE TABLE "tenant_sales_attribution" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"sales_user_id" text NOT NULL,
	"source" text NOT NULL,
	"attributed_by" text,
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_sales_attribution_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "tenant_sales_attribution_sales_user_id_user_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "tenant_sales_attribution_attributed_by_user_id_fk" FOREIGN KEY ("attributed_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "tenant_sales_attribution_sales_idx" ON "tenant_sales_attribution" USING btree ("sales_user_id", "attributed_at");
--> statement-breakpoint
CREATE TABLE "sales_attribution_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"previous_sales_user_id" text,
	"next_sales_user_id" text,
	"source" text NOT NULL,
	"changed_by" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_attribution_audit_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "sales_attribution_audit_previous_sales_user_id_user_id_fk" FOREIGN KEY ("previous_sales_user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "sales_attribution_audit_next_sales_user_id_user_id_fk" FOREIGN KEY ("next_sales_user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "sales_attribution_audit_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "sales_attribution_audit_tenant_idx" ON "sales_attribution_audit" USING btree ("tenant_id", "created_at");
--> statement-breakpoint
CREATE TABLE "sales_commission" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"payment_gateway_log_id" text,
	"reversal_of_id" text,
	"entry_type" text NOT NULL,
	"base_amount" integer NOT NULL,
	"commission_rate_bps" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'payable' NOT NULL,
	"payout_reference" text,
	"reason" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_commission_sales_user_id_user_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "sales_commission_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "sales_commission_payment_gateway_log_id_payment_gateway_log_id_fk" FOREIGN KEY ("payment_gateway_log_id") REFERENCES "payment_gateway_log"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "sales_commission_reversal_of_id_sales_commission_id_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "sales_commission"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_commission_payment_unique" ON "sales_commission" USING btree ("payment_gateway_log_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sales_commission_reversal_unique" ON "sales_commission" USING btree ("reversal_of_id");
--> statement-breakpoint
CREATE INDEX "sales_commission_sales_status_idx" ON "sales_commission" USING btree ("sales_user_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX "sales_commission_tenant_idx" ON "sales_commission" USING btree ("tenant_id", "created_at");
