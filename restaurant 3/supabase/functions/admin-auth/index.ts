// supabase/functions/admin-auth/index.ts
// supabase functions deploy admin-auth
// supabase secrets set ADMIN_PASSWORD=ваш_пароль

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { password } = await req.json();
    const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");

    if (!ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ ok: false, error: "Not configured" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (password === ADMIN_PASSWORD) {
      const token = `${Date.now()}.${crypto.randomUUID()}`;
      return new Response(JSON.stringify({ ok: true, token }),
        { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    await new Promise(r => setTimeout(r, 500)); // anti-brute-force
    return new Response(JSON.stringify({ ok: false, error: "Invalid password" }),
      { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Bad request" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
