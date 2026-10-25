import { db } from '../lib/supabase.js';
import { CONFIG } from '../config.js';

export async function sendPush(to, title, body) {
  try { await db.functions.invoke('send-push', { body: { to, title, text: body } }); } catch (e) {}
}

export function initPush(who) {
  const base = new URL('.', location.href).pathname;
  const swPath = base + 'onesignal/';
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OS) {
    try {
      await OS.init({
        appId: CONFIG.ONESIGNAL_APP_ID,
        // La app está configurada como "Typical Site" en el dashboard, por lo que
        // sin esta bandera el SDK ignora path/serviceWorkerParam y usa la ruta "/"
        // del dashboard (que en GitHub Pages da 404). Esto fuerza usar la ruta correcta.
        serviceWorkerOverrideForTypical: true,
        path: swPath,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: swPath },
      });
      await OS.login(who);
      if (OS.Notifications && OS.Notifications.requestPermission) OS.Notifications.requestPermission();
    } catch (e) {}
  });
}

// Realtime: las tablas con replication activada se reflejan en vivo en los dos teléfonos.
export function initRealtime(refetch) {
  try {
    db.channel('live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'te_quiero' }, () => refetch('teQuiero'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_diarios' }, () => refetch('mensajes'))
      .subscribe();
  } catch (e) {}
}
