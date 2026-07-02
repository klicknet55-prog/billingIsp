ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "map_geocoding_provider" text DEFAULT 'nominatim' NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "google_geocoding_api_key_encrypted" text;
