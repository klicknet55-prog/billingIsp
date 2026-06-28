CREATE TABLE "portal_access_code" (
	"code" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pelanggan_id" text NOT NULL,
	"redirect" text DEFAULT '/portal/tagihan' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_access_code" ADD CONSTRAINT "portal_access_code_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portal_access_code" ADD CONSTRAINT "portal_access_code_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "portal_access_code_pelanggan" ON "portal_access_code" USING btree ("tenant_id","pelanggan_id");
