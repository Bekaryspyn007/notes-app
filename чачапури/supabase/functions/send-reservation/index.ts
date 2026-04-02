// supabase/functions/send-reservation/index.ts
// supabase functions deploy send-reservation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { reservation } = await req.json();
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: saved, error: dbErr } = await sb.from("reservations").insert([{
      name:         reservation.name,
      phone:        reservation.phone,
      date:         reservation.date,
      time:         reservation.time,
      people_count: reservation.people_count,
      table_num:    reservation.table_num || "",
      comment:      reservation.comment || "",
    }]).select().single();

    if (dbErr) throw dbErr;

    const tok   = Deno.env.get("TELEGRAM_TOKEN");
    const cid   = Deno.env.get("TELEGRAM_CHAT_ID");
    const rName = Deno.env.get("RESTAURANT_NAME") || "Ресторан";

    if (tok && cid) {
      const dateStr = new Date(reservation.date).toLocaleDateString("ru", {
        day: "numeric", month: "long", year: "numeric",
      });
      const text =
        `📅 *Новая бронь — ${rName}*\n\n` +
        `👤 ${reservation.name}\n` +
        `📞 ${reservation.phone}\n` +
        `📆 ${dateStr} в ${reservation.time}\n` +
        `👥 Гостей: ${reservation.people_count}\n` +
        (reservation.table_num ? `🪑 Стол: ${reservation.table_num}\n` : "") +
        (reservation.comment   ? `\n💬 _${reservation.comment}_` : "");

      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cid, text, parse_mode: "Markdown" }),
      });
    }

    return new Response(JSON.stringify({ ok: true, id: saved.id }),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
