/**
 * Supabase client singleton.
 *
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your
 * environment (or .env.local) to connect to a real Supabase project.
 *
 * The app currently uses the in-memory store (see store.ts) so Supabase is
 * optional.  When you're ready to persist data, replace the store helpers with
 * Supabase queries using this client.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
