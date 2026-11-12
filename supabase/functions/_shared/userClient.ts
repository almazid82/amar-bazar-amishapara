import { createClient } from "npm:@supabase/supabase-js@2";

export async function getUserClient(request: Request) {
  const authorization = request.headers.get("authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!authorization?.startsWith("Bearer ") || !url || !key) return null;
  const jwt = authorization.slice("Bearer ".length).trim();
  if (!jwt) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { client, user: data.user };
}
