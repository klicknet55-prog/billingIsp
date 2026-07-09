ALTER TABLE "tenant" ADD COLUMN "referral_code" text;
--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "referred_by_tenant_id" text;
--> statement-breakpoint
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_referred_by_tenant_id_tenant_id_fk" FOREIGN KEY ("referred_by_tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_referral_code_unique" ON "tenant" USING btree ("referral_code");
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "referral_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "referral_reward_days" integer DEFAULT 7 NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "referral_max_per_tenant" integer DEFAULT 10 NOT NULL;
--> statement-breakpoint
CREATE TABLE "referral_reward" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_tenant_id" text NOT NULL,
	"referee_tenant_id" text NOT NULL,
	"referral_code" text NOT NULL,
	"reward_days" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"reject_reason" text,
	"rewarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_referrer_tenant_id_tenant_id_fk" FOREIGN KEY ("referrer_tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_referee_tenant_id_tenant_id_fk" FOREIGN KEY ("referee_tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "referral_reward_referee_unique" ON "referral_reward" USING btree ("referee_tenant_id");
