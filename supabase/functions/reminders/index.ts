// Recordatorios diarios al mediodía (cron).
// Envía push directo a OneSignal: a él (cargar adviento) y a ella (revisar).
// Secrets: ONESIGNAL_APP_ID y ONESIGNAL_REST_KEY (ya están en el vault del proyecto).
Deno.serve(async (_req) => {
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
    // A él: cargar la puerta del adviento (solo hasta el cumple).
    if (Date.now() <= new Date('2026-11-21T15:00:00Z').getTime()) {
      await push('el', '📅 Adviento', 'Recordá cargar la puerta de hoy en el calendario. ❤️');
    }
    // A ella: revisar.
    await push('ella', '💌 Para vos', 'Hay algo para vos en nuestra página. ¡Mirá! 💫');
    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
