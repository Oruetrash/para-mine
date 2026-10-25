import { db } from '../lib/supabase.js';
import { CONFIG } from '../config.js';

export async function sendPush(to, title, body) {
  try { await db.functions.invoke('send-push', { body: { to, title, text: body } }); } catch (e) {}
}

let oneSignalScriptLoaded = false;

function loadOneSignalScript() {
  if (oneSignalScriptLoaded || document.getElementById('onesignal-sdk')) return;
  oneSignalScriptLoaded = true;
  const s = document.createElement('script');
  s.id = 'onesignal-sdk';
  s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  s.defer = true;
  document.head.appendChild(s);
}

// Se llama después del login. No pide permiso todavía (va detrás de un gesto).
export function initPush(who) {
  const base = new URL('.', location.href).pathname;
  const swPath = base + 'onesignal/';
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OS) {
    try {
      await OS.init({
        appId: CONFIG.ONESIGNAL_APP_ID,
        serviceWorkerOverrideForTypical: true,
        path: swPath,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: swPath },
      });
      await OS.login(who);
      window.__oneSignal = OS;
    } catch (e) {}
  });
  loadOneSignalScript();
}

// Pedir permiso solo con un gesto del usuario (iOS lo exige).
export async function requestPushPermission() {
  const OS = window.__oneSignal;
  if (OS?.Notifications?.requestPermission) await OS.Notifications.requestPermission();
}

// Realtime: las tablas con replication activada se reflejan en vivo en los dos teléfonos.
export function initRealtime({ onTeQuiero, onMensajes }) {
  try {
    db.channel('live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'te_quiero' }, () => onTeQuiero && onTeQuiero())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_diarios' }, () => onMensajes && onMensajes())
      .subscribe();
  } catch (e) {}
}
