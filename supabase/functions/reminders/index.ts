// Recordatorios diarios al mediodía (vía pg_cron).
// verify_jwt=false (lo llama pg_net); se protege pidiendo la service_role key.
// Secrets: ONESIGNAL_APP_ID y ONESIGNAL_REST_KEY (ya están en el vault del proyecto).
Deno.serve(async (req) => {
  const apikey = req.headers.get('apikey') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!serviceRole || apikey !== serviceRole) {
    return new Response('unauthorized', { status: 401 });
  }

  const appId = Deno.env.get('ONESIGNAL_APP_ID');
  const restKey = Deno.env.get('ONESIGNAL_REST_KEY');
  if (!appId || !restKey) return new Response('faltan secretos', { status: 500 });

  async function push(to, title, text) {
    const payload = {
      app_id: appId,
      include_aliases: { external_id: [to] },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: text },
    };
    await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + restKey },
      body: JSON.stringify(payload),
    });
  }

  try {
    if (Date.now() <= new Date('2026-11-21T15:00:00Z').getTime()) {
      await push('el', '📅 Adviento', 'Recordá cargar la puerta de hoy en el calendario. ❤️');
    }
    await push('ella', '💌 Para vos', 'Hay algo para vos en nuestra página. ¡Mirá! 💫');
    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
