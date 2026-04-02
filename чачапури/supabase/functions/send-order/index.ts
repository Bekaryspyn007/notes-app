// supabase/functions/send-order/index.ts
// supabase functions deploy send-order
// supabase secrets set TELEGRAM_TOKEN=xxx TELEGRAM_CHAT_ID=xxx RESTAURANT_NAME=xxx

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
    const { order } = await req.json();
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Сохраняем заказ в БД
    const { data: saved, error: dbErr } = await sb.from("orders").insert([{
      table_num:  order.table,
      items:      order.items,   // [{id,name,qty,price,comment}]
      total:      order.total,
      comment:    order.comment || "",
      daily_date: new Date().toISOString().split("T")[0],
    }]).select().single();

    if (dbErr) throw dbErr;

    // Telegram
    const tok = Deno.env.get("TELEGRAM_TOKEN");
    const cid = Deno.env.get("TELEGRAM_CHAT_ID");
    const rName = Deno.env.get("RESTAURANT_NAME") || "Ресторан";

    if (tok && cid) {
      const lines = order.items.map((i: any) => {
        const comment = i.comment ? ` _(${i.comment})_` : "";
        return `  • ${i.name} × ${i.qty} — ${(i.price * i.qty).toLocaleString("ru")} ₸${comment}`;
      }).join("\n");

      const time = new Date().toLocaleString("ru", { timeZone: "Asia/Almaty" });

      const text =
        `🍽 *Новый заказ — ${rName}*\n\n` +
        `🪑 Стол: *${order.table}*\n` +
        `🕐 ${time}\n\n` +
        `${lines}\n\n` +
        `━━━━━━━━━━━\n` +
        `💰 *${order.total.toLocaleString("ru")} ₸*` +
        (order.comment ? `\n\n💬 _${order.comment}_` : "");

      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cid, text, parse_mode: "Markdown" }),
      });
    }

    return new Response(JSON.stringify({ ok: true, orderId: saved.id }),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
