CREATE TABLE "sales_commission_payout_request" (
	"id" text PRIMARY KEY NOT NULL,
	"sales_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"payout_method" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"payout_reference" text,
	"rejection_reason" text,
	"reviewed_by" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	CONSTRAINT "sales_commission_payout_request_sales_user_id_user_id_fk"
		FOREIGN KEY ("sales_user_id") REFERENCES "user"("id"),
	CONSTRAINT "sales_commission_payout_request_reviewed_by_user_id_fk"
		FOREIGN KEY ("reviewed_by") REFERENCES "user"("id")
);
--> statement-breakpoint
CREATE INDEX "sales_commission_payout_request_sales_idx"
	ON "sales_commission_payout_request" USING btree ("sales_user_id", "requested_at");
--> statement-breakpoint
ALTER TABLE "sales_commission"
	ADD COLUMN "payout_request_id" text;
--> statement-breakpoint
ALTER TABLE "sales_commission"
	ADD CONSTRAINT "sales_commission_payout_request_id_sales_commission_payout_request_id_fk"
	FOREIGN KEY ("payout_request_id") REFERENCES "sales_commission_payout_request"("id");
--> statement-breakpoint
CREATE INDEX "sales_commission_payout_request_idx"
	ON "sales_commission" USING btree ("payout_request_id");
