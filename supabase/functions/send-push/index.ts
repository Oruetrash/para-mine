// Edge Function: envía una notificación push vía OneSignal.
// Seguridad: verifica el JWT del usuario (no acepta anon), valida el destinatario
// y limita los textos. CORS restringido al dominio de la app.
//
// Secrets requeridos:
//   ONESIGNAL_APP_ID  = 5ff32a07-7980-4692-aa0f-c48f17853f8f
//   ONESIGNAL_REST_KEY = (tu REST API Key, secreta)
// SUPABASE_URL y SUPABASE_ANON_KEY los inyecta Supabase automáticamente.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = 'https://oruetrash.github.io';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = (origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost')) ? origin : 'null';
  const cors = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const restKey = Deno.env.get('ONESIGNAL_REST_KEY');
  if (!appId || !restKey) {
    return new Response(JSON.stringify({ error: 'Faltan secretos ONESIGNAL_APP_ID / ONESIGNAL_REST_KEY' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // Verificar JWT: solo usuarios autenticados (no anon).
  const auth = req.headers.get('Authorization') || '';
  if (!auth) return new Response('unauthorized', { status: 401, headers: cors });
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401, headers: cors });

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
  const { to, title, text } = body || {};
  if (!['el', 'ella'].includes(to)) return new Response('bad to', { status: 400, headers: cors });
  const t = String(title || '').slice(0, 80);
  const x = String(text || '').slice(0, 300);
  if (!to || !t || !x) {
    return new Response(JSON.stringify({ error: 'Faltan to/title/text' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const payload = {
    app_id: appId,
    include_aliases: { external_id: [to] },
    target_channel: 'push',
    headings: { en: t },
    contents: { en: x },
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
