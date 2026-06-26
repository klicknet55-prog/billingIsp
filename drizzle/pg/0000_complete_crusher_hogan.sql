CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pelanggan_id" text NOT NULL,
	"no_invoice" text NOT NULL,
	"total_tagihan" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"line_items" jsonb,
	"tgl_jatuh_tempo" timestamp with time zone,
	"pre_due_reminded_at" timestamp with time zone,
	"tgl_lunas" timestamp with time zone,
	"metode_bayar" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kategori_pengeluaran" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"nama" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"tenant_id" text,
	"status" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"started_by" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_send_log" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"tenant_id" text,
	"recipient_type" text NOT NULL,
	"recipient_id" text NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"template_key" text,
	"batch_id" text,
	"sent_by" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_template" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"tenant_id" text,
	"key" text NOT NULL,
	"body" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odp" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"kode" text NOT NULL,
	"nama" text,
	"latitude" double precision,
	"longitude" double precision,
	"splitter_rasio" text,
	"redaman_input_db" double precision,
	"redaman_output_db" double precision,
	"splitter_pasif" text,
	"kapasitas_port" integer DEFAULT 8 NOT NULL,
	"input_router_id" text,
	"input_odp_id" text,
	"catatan" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_code" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"harga_bulanan" integer DEFAULT 0 NOT NULL,
	"diskon_tahunan_persen" integer DEFAULT 0 NOT NULL,
	"limitasi" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paket_internet" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"router_id" text,
	"tipe" text DEFAULT 'pppoe' NOT NULL,
	"nama" text NOT NULL,
	"kecepatan" text NOT NULL,
	"mikrotik_profile_pppoe" text,
	"mikrotik_profile_hotspot" text,
	"harga_bulanan" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pelanggan_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"selection" text NOT NULL,
	"status" text NOT NULL,
	"receipt_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"reference_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"duitku_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"payment_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pelanggan" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"nama" text NOT NULL,
	"no_wa" text NOT NULL,
	"connection_type" text DEFAULT 'pppoe' NOT NULL,
	"connection_username" text,
	"connection_password" text,
	"alamat" text,
	"latitude" double precision,
	"longitude" double precision,
	"ip_address" text,
	"paket_internet_id" text,
	"router_id" text,
	"kolektor_id" text,
	"odp_id" text,
	"odp_port" text,
	"tgl_daftar" timestamp with time zone,
	"tgl_jatuh_tempo" timestamp with time zone,
	"is_isolated" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengeluaran" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"kategori_id" text,
	"jumlah" integer DEFAULT 0 NOT NULL,
	"catatan" text,
	"tanggal" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_name" text DEFAULT 'BILLING RT-RW NET' NOT NULL,
	"brand_tagline" text,
	"logo_url" text,
	"owner_name" text,
	"owner_phone" text,
	"owner_email" text,
	"address" text,
	"telegram_group_url" text,
	"tentang_title" text NOT NULL,
	"tentang_content" text NOT NULL,
	"kontak_title" text NOT NULL,
	"kontak_content" text NOT NULL,
	"kontak_whatsapp" text,
	"tc_title" text NOT NULL,
	"tc_content" text NOT NULL,
	"cron_last_run_at" timestamp with time zone,
	"cron_last_result" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_whatsapp_config" (
	"id" text PRIMARY KEY NOT NULL,
	"api_url" text NOT NULL,
	"api_token_encrypted" text NOT NULL,
	"provider" text DEFAULT 'waba' NOT NULL,
	"phone_number_id" text,
	"device_id" text,
	"basic_auth_user" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_tagihan_link" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"tagihan_id" text NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "router" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"nama" text NOT NULL,
	"connection_mode" text DEFAULT 'rest' NOT NULL,
	"ip_address" text NOT NULL,
	"api_port" text DEFAULT '8728' NOT NULL,
	"username" text NOT NULL,
	"password_encrypted" text NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"tenant_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"package_tenant_id" text NOT NULL,
	"billing_period" text DEFAULT 'monthly' NOT NULL,
	"mulai" timestamp with time zone DEFAULT now() NOT NULL,
	"akhir" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"remind_7d_at" timestamp with time zone,
	"remind_1d_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tagihan" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pelanggan_id" text NOT NULL,
	"periode" text NOT NULL,
	"amount" integer NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"receipt_id" text,
	"pre_due_reminded_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"metode_bayar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_duitku_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"merchant_code" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"callback_url" text,
	"inquiry_url" text,
	"payment_method" text DEFAULT 'VC' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_duitku_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_whatsapp_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"api_url" text NOT NULL,
	"api_token_encrypted" text NOT NULL,
	"provider" text DEFAULT 'waba' NOT NULL,
	"phone_number_id" text,
	"device_id" text,
	"basic_auth_user" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_whatsapp_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"nama_usaha" text NOT NULL,
	"logo_url" text,
	"domain" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"theme_preset" text DEFAULT 'default' NOT NULL,
	"theme_mode" text DEFAULT 'light' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "ticket_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"pelanggan_id" text NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text,
	"foto_url" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"phone" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kategori_pengeluaran" ADD CONSTRAINT "kategori_pengeluaran_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_batch" ADD CONSTRAINT "message_batch_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_send_log" ADD CONSTRAINT "message_send_log_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odp" ADD CONSTRAINT "odp_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odp" ADD CONSTRAINT "odp_input_router_id_router_id_fk" FOREIGN KEY ("input_router_id") REFERENCES "public"."router"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paket_internet" ADD CONSTRAINT "paket_internet_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paket_internet" ADD CONSTRAINT "paket_internet_router_id_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."router"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempt" ADD CONSTRAINT "payment_attempt_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempt" ADD CONSTRAINT "payment_attempt_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateway_log" ADD CONSTRAINT "payment_gateway_log_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_paket_internet_id_paket_internet_id_fk" FOREIGN KEY ("paket_internet_id") REFERENCES "public"."paket_internet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_router_id_router_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."router"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_kolektor_id_user_id_fk" FOREIGN KEY ("kolektor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_odp_id_odp_id_fk" FOREIGN KEY ("odp_id") REFERENCES "public"."odp"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelanggan" ADD CONSTRAINT "pelanggan_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_kategori_id_kategori_pengeluaran_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_pengeluaran"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_tagihan_link" ADD CONSTRAINT "receipt_tagihan_link_receipt_id_invoice_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_tagihan_link" ADD CONSTRAINT "receipt_tagihan_link_tagihan_id_tagihan_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "router" ADD CONSTRAINT "router_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_package_tenant_id_package_tenant_id_fk" FOREIGN KEY ("package_tenant_id") REFERENCES "public"."package_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_receipt_id_invoice_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_duitku_config" ADD CONSTRAINT "tenant_duitku_config_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_whatsapp_config" ADD CONSTRAINT "tenant_whatsapp_config_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignment" ADD CONSTRAINT "ticket_assignment_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignment" ADD CONSTRAINT "ticket_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_pelanggan_id_pelanggan_id_fk" FOREIGN KEY ("pelanggan_id") REFERENCES "public"."pelanggan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_template_scope_key" ON "message_template" USING btree ("scope","tenant_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "odp_tenant_kode" ON "odp" USING btree ("tenant_id","kode");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempt_idempotency" ON "payment_attempt" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "tagihan_tenant_pelanggan_periode" ON "tagihan" USING btree ("tenant_id","pelanggan_id","periode");