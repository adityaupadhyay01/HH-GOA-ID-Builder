/**
 * SUPABASE CONFIGURATION
 * -----------------------------------------------------------------------
 * Only the PUBLIC anon key belongs here. It is safe to ship this key to
 * the browser as long as Row Level Security (RLS) policies are enabled
 * on every table and storage bucket (see supabase-schema.sql).
 *
 * NEVER put a service_role key in this file or anywhere in frontend code.
 *
 * Leave the placeholder values as-is to run the app fully offline —
 * photo upload, card generation and PNG download all work with zero
 * backend configured. Supabase only adds optional cloud persistence.
 * -----------------------------------------------------------------------
 */
window.SUPABASE_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",       // e.g. https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  STORAGE_BUCKET: "builder-cards",
  TABLE_NAME: "builder_cards"
};
