// Edge Function: envía una notificación push vía OneSignal
// Secrets requeridos en Supabase:
//   ONESIGNAL_APP_ID  = 15190aaf-b1ec-4414-b27b-e78857f6717f
//   ONESIGNAL_REST_KEY = (tu REST API Key, secreta)

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const restKey = Deno.env.get('ONESIGNAL_REST_KEY');
  if (!appId || !restKey) {
    return new Response(JSON.stringify({ error: 'Faltan secretos ONESIGNAL_APP_ID / ONESIGNAL_REST_KEY' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
  const { to, title, text } = body;
  if (!to || !title || !text) {
    return new Response(JSON.stringify({ error: 'Faltan to/title/text' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const payload = {
    app_id: appId,
    include_aliases: { external_id: [to] },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: text },
  };

  const res = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + restKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  return new Response(JSON.stringify({ ok: res.ok, data }), {
    status: res.ok ? 200 : 502,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
