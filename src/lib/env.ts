import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_STORE_ID: z.string().optional(),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_STORE_ID: process.env.NEXT_PUBLIC_SUPABASE_STORE_ID,
  });
}

export function getStoreId() {
  const storeId = getPublicEnv().NEXT_PUBLIC_SUPABASE_STORE_ID;
  if (!storeId) return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId) ? storeId : undefined;
}

/**
 * True when NEXT_PUBLIC_AUTH_DISABLED=true. Login is skipped, everyone is treated as an
 * owner, and data comes from the browser-only demo store (src/lib/demo/store.ts) instead
 * of Supabase. For local testing only: leave it unset in production.
 */
export function isAuthDisabled() {
  return process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
}
