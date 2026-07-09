CREATE TABLE "community_donation" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"duitku_order_id" text NOT NULL,
	"payment_method" text,
	"nama_usaha" text NOT NULL,
	"domain" text NOT NULL,
	"donor_nama" text NOT NULL,
	"donor_role" text NOT NULL,
	"logo_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_donation" ADD CONSTRAINT "community_donation_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_donation" ADD CONSTRAINT "community_donation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "community_donation_order_unique" ON "community_donation" USING btree ("duitku_order_id");
