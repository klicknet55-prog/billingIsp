ALTER TABLE "tagihan" ADD COLUMN "amount_paid" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "dunning_step2_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tagihan" ADD COLUMN "dunning_final_at" timestamp with time zone;
