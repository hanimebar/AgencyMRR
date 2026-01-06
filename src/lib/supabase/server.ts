/**
 * Supabase client for server-side operations
 * Uses the service role key to bypass RLS for admin operations
 * 
 * IMPORTANT: Only use this in server components, API routes, and server actions
 * Never expose the service role key to the client
 * 
 * Uses lazy initialization to avoid build-time errors when env vars aren't available.
 * The client is only created when first accessed, not at module load time.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase admin client
 * Uses lazy initialization to avoid build-time errors when env vars aren't available
 */
function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    // Check if we're in a build context (Next.js sets this during build)
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || 
                       process.env.NEXT_PHASE === "phase-development-build";
    
    if (isBuildTime) {
      // During build, create a client with placeholder values to avoid build errors
      // This client will never be used at runtime - actual routes will have env vars
      supabaseAdminInstance = createClient(
        "https://placeholder.supabase.co",
        "placeholder-service-role-key",
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      return supabaseAdminInstance;
    }

    // At runtime, throw a clear error if env vars are missing
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminInstance;
}

// Export a Proxy that lazily initializes the client on first property access
// This allows the module to be imported without immediately creating the client
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = client[prop as keyof SupabaseClient];
    // If it's a function, bind it to the client so 'this' works correctly
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
