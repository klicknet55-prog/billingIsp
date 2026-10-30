import type Database from "better-sqlite3";
import { applyColumnPatches, hasDbTable } from "./schema-patches";

type TableInfo = { name: string };

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  return rows.some((r) => r.name === column);
}

/**
 * Migrasi schema yang wajib jalan saat app startup (dev & production).
 * Idempotent — aman dipanggil berulang.
 */
export function applyAppSchemaMigrations(
  db: Database.Database,
  opts?: { log?: boolean }
): number {
  const log = opts?.log ?? false;
  let applied = applyColumnPatches(db, { log });

  if (!hasDbTable(db, "sales_profile")) {
    db.exec(`
      CREATE TABLE sales_profile (
        user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id),
        referral_code TEXT NOT NULL UNIQUE,
        commission_rate_bps INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel sales_profile dibuat");
  }

  if (!hasDbTable(db, "tenant_sales_attribution")) {
    db.exec(`
      CREATE TABLE tenant_sales_attribution (
        tenant_id TEXT PRIMARY KEY NOT NULL REFERENCES tenant(id),
        sales_user_id TEXT NOT NULL REFERENCES user(id),
        source TEXT NOT NULL,
        attributed_by TEXT REFERENCES user(id),
        attributed_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX tenant_sales_attribution_sales_idx
        ON tenant_sales_attribution(sales_user_id, attributed_at);
    `);
    applied++;
    if (log) console.log("[ok]   tabel tenant_sales_attribution dibuat");
  }

  if (!hasDbTable(db, "sales_attribution_audit")) {
    db.exec(`
      CREATE TABLE sales_attribution_audit (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        previous_sales_user_id TEXT REFERENCES user(id),
        next_sales_user_id TEXT REFERENCES user(id),
        source TEXT NOT NULL,
        changed_by TEXT REFERENCES user(id),
        reason TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX sales_attribution_audit_tenant_idx
        ON sales_attribution_audit(tenant_id, created_at);
    `);
    applied++;
    if (log) console.log("[ok]   tabel sales_attribution_audit dibuat");
  }

  if (!hasDbTable(db, "sales_commission")) {
    db.exec(`
      CREATE TABLE sales_commission (
        id TEXT PRIMARY KEY NOT NULL,
        sales_user_id TEXT NOT NULL REFERENCES user(id),
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        payment_gateway_log_id TEXT UNIQUE REFERENCES payment_gateway_log(id),
        reversal_of_id TEXT UNIQUE REFERENCES sales_commission(id),
        entry_type TEXT NOT NULL,
        base_amount INTEGER NOT NULL,
        commission_rate_bps INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        payout_request_id TEXT REFERENCES sales_commission_payout_request(id),
        status TEXT NOT NULL DEFAULT 'payable',
        payout_reference TEXT,
        reason TEXT,
        paid_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX sales_commission_sales_status_idx
        ON sales_commission(sales_user_id, status, created_at);
      CREATE INDEX sales_commission_tenant_idx
        ON sales_commission(tenant_id, created_at);
      CREATE INDEX sales_commission_payout_request_idx
        ON sales_commission(payout_request_id);
    `);
    applied++;
    if (log) console.log("[ok]   tabel sales_commission dibuat");
  }

  if (!hasDbTable(db, "sales_commission_payout_request")) {
    db.exec(`
      CREATE TABLE sales_commission_payout_request (
        id TEXT PRIMARY KEY NOT NULL,
        sales_user_id TEXT NOT NULL REFERENCES user(id),
        amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested',
        payout_method TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        payout_reference TEXT,
        rejection_reason TEXT,
        reviewed_by TEXT REFERENCES user(id),
        requested_at INTEGER NOT NULL DEFAULT (unixepoch()),
        reviewed_at INTEGER,
        paid_at INTEGER
      );
      CREATE INDEX sales_commission_payout_request_sales_idx
        ON sales_commission_payout_request(sales_user_id, requested_at);
    `);
    applied++;
    if (log) console.log("[ok]   tabel sales_commission_payout_request dibuat");
  }

  if (
    hasDbTable(db, "sales_commission") &&
    !hasColumn(db, "sales_commission", "payout_request_id")
  ) {
    db.exec(
      "ALTER TABLE sales_commission ADD COLUMN payout_request_id TEXT REFERENCES sales_commission_payout_request(id)"
    );
    db.exec(
      "CREATE INDEX IF NOT EXISTS sales_commission_payout_request_idx ON sales_commission(payout_request_id)"
    );
    applied++;
    if (log) console.log("[ok]   kolom sales_commission.payout_request_id ditambahkan");
  }

  if (!hasDbTable(db, "sales_commission_retention_summary")) {
    db.exec(`
      CREATE TABLE sales_commission_retention_summary (
        sales_user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id),
        paid_amount INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel sales_commission_retention_summary dibuat");
  }

  if (!hasDbTable(db, "data_retention_run")) {
    db.exec(`
      CREATE TABLE data_retention_run (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        period TEXT NOT NULL,
        notification_status TEXT NOT NULL DEFAULT 'pending',
        notification_sent_at INTEGER,
        purge_status TEXT NOT NULL DEFAULT 'pending',
        archive_path TEXT,
        deleted_counts TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX data_retention_run_tenant_period_unique
        ON data_retention_run(tenant_id, period);
      CREATE INDEX data_retention_run_period_status_idx
        ON data_retention_run(period, purge_status);
    `);
    applied++;
    if (log) console.log("[ok]   tabel data_retention_run dibuat");
  }

  if (hasDbTable(db, "tenant") && hasColumn(db, "tenant", "referral_code")) {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS tenant_referral_code_unique ON tenant(referral_code)"
    );
    if (log) console.log("[ok]   index tenant_referral_code_unique");
  }

  if (!hasDbTable(db, "tagihan")) {
    db.exec(`
      CREATE TABLE tagihan (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        pelanggan_id TEXT NOT NULL REFERENCES pelanggan(id),
        periode TEXT NOT NULL,
        amount INTEGER NOT NULL,
        due_date INTEGER NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        receipt_id TEXT REFERENCES invoice(id),
        pre_due_reminded_at INTEGER,
        paid_at INTEGER,
        metode_bayar TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX IF NOT EXISTS tagihan_tenant_pelanggan_periode ON tagihan(tenant_id, pelanggan_id, periode);
    `);
    applied++;
    if (log) console.log("[ok]   tabel tagihan dibuat");
  }

  if (!hasDbTable(db, "receipt_tagihan_link")) {
    db.exec(`
      CREATE TABLE receipt_tagihan_link (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL REFERENCES invoice(id),
        tagihan_id TEXT NOT NULL REFERENCES tagihan(id),
        amount INTEGER NOT NULL
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel receipt_tagihan_link dibuat");
  }

  if (!hasDbTable(db, "payment_attempt")) {
    db.exec(`
      CREATE TABLE payment_attempt (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        pelanggan_id TEXT NOT NULL REFERENCES pelanggan(id),
        idempotency_key TEXT NOT NULL,
        selection TEXT NOT NULL,
        status TEXT NOT NULL,
        receipt_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_idempotency ON payment_attempt(tenant_id, idempotency_key);
    `);
    applied++;
    if (log) console.log("[ok]   tabel payment_attempt dibuat");
  }

  if (!hasDbTable(db, "platform_whatsapp_config")) {
    db.exec(`
      CREATE TABLE platform_whatsapp_config (
        id TEXT PRIMARY KEY,
        api_url TEXT NOT NULL,
        api_token_encrypted TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'waba',
        phone_number_id TEXT,
        device_id TEXT,
        basic_auth_user TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel platform_whatsapp_config dibuat");
  }

  if (!hasDbTable(db, "device_push_token")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS device_push_token (
        id TEXT PRIMARY KEY,
        tenant_id TEXT REFERENCES tenant(id),
        subject_type TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        app TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'android',
        token TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS device_push_token_subject_idx
        ON device_push_token(tenant_id, subject_type, subject_id, app);
    `);
    applied++;
    if (log) console.log("[ok]   tabel device_push_token dibuat");
  }

  if (!hasDbTable(db, "push_notification_log")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS push_notification_log (
        id TEXT PRIMARY KEY,
        tenant_id TEXT REFERENCES tenant(id),
        subject_type TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        app TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        token TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 1,
        response TEXT,
        error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS push_notification_log_tenant_idx
        ON push_notification_log(tenant_id, created_at);
    `);
    applied++;
    if (log) console.log("[ok]   tabel push_notification_log dibuat");
  }

  if (!hasDbTable(db, "portal_access_code")) {
    db.exec(`
      CREATE TABLE portal_access_code (
        code TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        pelanggan_id TEXT NOT NULL REFERENCES pelanggan(id),
        redirect TEXT NOT NULL DEFAULT '/portal/tagihan',
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS portal_access_code_pelanggan ON portal_access_code(tenant_id, pelanggan_id);
    `);
    applied++;
    if (log) console.log("[ok]   tabel portal_access_code dibuat");
  }

  if (!hasDbTable(db, "tenant_api_key")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_api_key (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        label TEXT NOT NULL DEFAULT 'Default',
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        last_used_at INTEGER,
        revoked_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX IF NOT EXISTS tenant_api_key_hash ON tenant_api_key(key_hash);
    `);
    applied++;
    if (log) console.log("[ok]   tabel tenant_api_key dibuat");
  }

  if (!hasDbTable(db, "tenant_webhook")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_webhook (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL UNIQUE REFERENCES tenant(id),
        url TEXT NOT NULL,
        secret_encrypted TEXT NOT NULL,
        events TEXT NOT NULL DEFAULT '[]',
        is_enabled INTEGER NOT NULL DEFAULT 0,
        last_delivery_at INTEGER,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel tenant_webhook dibuat");
  }

  if (!hasDbTable(db, "webhook_delivery_log")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_delivery_log (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        webhook_id TEXT NOT NULL REFERENCES tenant_webhook(id),
        event TEXT NOT NULL,
        request_url TEXT NOT NULL,
        request_body TEXT NOT NULL,
        status_code INTEGER,
        response_body TEXT,
        success INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        duration_ms INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS webhook_delivery_log_tenant ON webhook_delivery_log(tenant_id, created_at);
    `);
    applied++;
    if (log) console.log("[ok]   tabel webhook_delivery_log dibuat");
  }

  if (!hasDbTable(db, "pelanggan_import_batch")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pelanggan_import_batch (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        status TEXT NOT NULL DEFAULT 'queued',
        mode TEXT NOT NULL DEFAULT 'skip',
        total INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        csv_payload TEXT NOT NULL,
        row_results TEXT,
        error TEXT,
        created_by TEXT REFERENCES user(id),
        started_at INTEGER,
        finished_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel pelanggan_import_batch dibuat");
  }

  if (!hasDbTable(db, "referral_reward")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS referral_reward (
        id TEXT PRIMARY KEY,
        referrer_tenant_id TEXT NOT NULL REFERENCES tenant(id),
        referee_tenant_id TEXT NOT NULL UNIQUE REFERENCES tenant(id),
        referral_code TEXT NOT NULL,
        reward_days INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        reject_reason TEXT,
        rewarded_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel referral_reward dibuat");
  }

  if (!hasDbTable(db, "community_donation")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS community_donation (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        user_id TEXT NOT NULL REFERENCES user(id),
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        duitku_order_id TEXT NOT NULL UNIQUE,
        payment_method TEXT,
        nama_usaha TEXT NOT NULL,
        domain TEXT NOT NULL,
        donor_nama TEXT NOT NULL,
        donor_role TEXT NOT NULL,
        logo_url TEXT,
        paid_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel community_donation dibuat");
  }

  if (!hasDbTable(db, "tenant_vpn_account")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_vpn_account (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        label TEXT,
        vpn_username TEXT NOT NULL UNIQUE,
        password_encrypted TEXT NOT NULL,
        static_ip TEXT NOT NULL,
        port_forward_name TEXT NOT NULL UNIQUE,
        listen_port INTEGER NOT NULL UNIQUE,
        destination_port INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel tenant_vpn_account dibuat");
  }

  if (hasDbTable(db, "pelanggan") && hasColumn(db, "pelanggan", "tgl_daftar")) {
    const backfill = db
      .prepare("UPDATE pelanggan SET tgl_daftar = created_at WHERE tgl_daftar IS NULL")
      .run();
    if (backfill.changes > 0 && log) {
      console.log(`[ok]   pelanggan.tgl_daftar backfill (${backfill.changes} baris)`);
    }
  }

  return applied;
}
