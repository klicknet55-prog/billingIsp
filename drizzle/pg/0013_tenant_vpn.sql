CREATE TABLE IF NOT EXISTS "tenant_vpn_account" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenant"("id"),
  "label" text,
  "vpn_username" text NOT NULL,
  "password_encrypted" text NOT NULL,
  "static_ip" text NOT NULL,
  "port_forward_name" text NOT NULL,
  "listen_port" integer NOT NULL,
  "destination_port" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_vpn_account_username_idx" ON "tenant_vpn_account" ("vpn_username");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_vpn_account_pf_name_idx" ON "tenant_vpn_account" ("port_forward_name");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_vpn_account_listen_port_idx" ON "tenant_vpn_account" ("listen_port");
