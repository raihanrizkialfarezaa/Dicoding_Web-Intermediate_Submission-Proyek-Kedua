import CONFIG from '../config';
import { saveSetting } from '../data/indexed-db';
import { showNotification } from './index';
import Auth from './auth';

const SUBSCRIPTION_KEY = 'push-subscription-enabled';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchPushPublicKey() {
  if (CONFIG.PUSH.PUBLIC_KEY) {
    return CONFIG.PUSH.PUBLIC_KEY;
  }

  const paths = CONFIG.PUSH.KEY_PATHS || [];

  for (const path of paths) {
    try {
      const response = await fetch(`${CONFIG.API_ENDPOINT}${path}`, {
        headers: {
          Accept: 'application/json,text/plain',
        },
      });

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (json && (json.publicKey || json.key)) {
          return json.publicKey || json.key;
        }
      } else {
        const text = (await response.text()).trim();
        if (text) {
          return text;
        }
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error('Kunci publik push notification tidak tersedia');
}

const FALLBACK_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

async function sendPushSubscription(method, subscription) {
  const endpoint = method === 'DELETE' ? CONFIG.PUSH.UNSUBSCRIBE_PATH : CONFIG.PUSH.SUBSCRIBE_PATH;
  if (!endpoint) {
    return;
  }

  try {
    const authHeaders = Auth.getAuthHeaders();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders);
    const isAuth = authHeaders && Object.keys(authHeaders).length > 0;

    let bodyPayload = null;
    if (method === 'DELETE') {
      bodyPayload = JSON.stringify({ endpoint: subscription ? subscription.endpoint : null });
    } else {
      const raw = subscription ? subscription.toJSON() : null;
      if (!raw) {
        bodyPayload = JSON.stringify({});
      } else {
        const keys =
          raw.keys && typeof raw.keys === 'object'
            ? {
                p256dh: raw.keys.p256dh,
                auth: raw.keys.auth,
              }
            : {};
        bodyPayload = JSON.stringify({ endpoint: raw.endpoint, keys });
      }
    }

    const response = await fetch(`${CONFIG.API_ENDPOINT}${endpoint}`, {
      method,
      headers,
      body: bodyPayload,
    });

    if (!response.ok) {
      if (response.status === 401 && !isAuth) {
        if (method === 'POST') {
          await saveSetting(SUBSCRIPTION_KEY, true);
          return;
        }
        if (method === 'DELETE') {
          await saveSetting(SUBSCRIPTION_KEY, false);
          return;
        }
      }

      let serverMsg = '';
      try {
        const json = await response.json();
        serverMsg = json && json.message ? `: ${json.message}` : '';
      } catch (e) {}
      throw new Error(`Server menolak pendaftaran langganan (status ${response.status})${serverMsg}`);
    }
  } catch (error) {
    if (method === 'POST') {
      throw new Error(error.message || 'Gagal mendaftarkan langganan push notification');
    }
  }
}

async function isPushSubscribed() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

async function enablePushSubscription() {
  if (Notification.permission === 'denied') {
    throw new Error('Izin notifikasi diblokir. Silakan aktifkan notifikasi di pengaturan browser untuk situs ini.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi ditolak. Silakan izinkan notifikasi untuk menggunakan fitur push notification.');
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) {
    await new Promise((resolve) => {
      const checkActive = () => {
        if (registration.active) {
          resolve();
        } else {
          setTimeout(checkActive, 100);
        }
      };
      checkActive();
    });
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    let publicKey = CONFIG.PUSH.PUBLIC_KEY || '';
    if (!publicKey) {
      try {
        publicKey = await fetchPushPublicKey();
      } catch (e) {
        publicKey = FALLBACK_PUBLIC_KEY;
      }
    }

    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (err) {
      try {
        const remoteKey = await fetchPushPublicKey().catch(() => FALLBACK_PUBLIC_KEY);
        if (remoteKey && remoteKey !== publicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(remoteKey),
          });
        } else {
          throw err;
        }
      } catch (err2) {
        throw new Error('Gagal membuat subscription push: ' + (err2.message || err.message));
      }
    }
  }

  try {
    await sendPushSubscription('POST', subscription);
    await saveSetting(SUBSCRIPTION_KEY, true);
    return subscription;
  } catch (err) {
    try {
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await current.unsubscribe();
      }
    } catch (e) {}
    throw err;
  }
}

async function disablePushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    await saveSetting(SUBSCRIPTION_KEY, false);
    return;
  }

  try {
    await sendPushSubscription('DELETE', subscription);
  } finally {
    await subscription.unsubscribe();
    await saveSetting(SUBSCRIPTION_KEY, false);
  }
}

async function updateButtonState(button) {
  const subscribed = await isPushSubscribed();
  if (button) {
    button.textContent = subscribed ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
    button.setAttribute('aria-pressed', subscribed ? 'true' : 'false');
  }
  try {
    const drawerBtn = document.getElementById('push-toggle-drawer');
    if (drawerBtn) {
      drawerBtn.textContent = subscribed ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
      drawerBtn.setAttribute('aria-pressed', subscribed ? 'true' : 'false');
    }
  } catch (e) {}
}

export async function initPushSubscriptionToggle(button) {
  if (!button) {
    return;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    button.disabled = true;
    button.textContent = 'Notifikasi tidak didukung';
    return;
  }

  if (!CONFIG.PUSH.PUBLIC_KEY) {
    try {
      const remoteKey = await fetchPushPublicKey().catch(() => null);
      if (remoteKey) {
        CONFIG.PUSH.PUBLIC_KEY = remoteKey;
      } else {
        CONFIG.PUSH.PUBLIC_KEY = FALLBACK_PUBLIC_KEY;
      }
    } catch (err) {
      CONFIG.PUSH.PUBLIC_KEY = FALLBACK_PUBLIC_KEY;
    }
  }

  await updateButtonState(button);
  const onToggleClick = async (evt) => {
    const btn = evt && evt.currentTarget ? evt.currentTarget : button;
    btn.disabled = true;
    try {
      if (await isPushSubscribed()) {
        await disablePushSubscription();
        showNotification('Langganan notifikasi dimatikan', 'info');
      } else {
        await enablePushSubscription();
        showNotification('Langganan notifikasi diaktifkan', 'success');
      }
    } catch (error) {
      showNotification(error.message || 'Gagal mengubah status notifikasi', 'error');
    } finally {
      btn.disabled = false;
      updateButtonState(button);
    }
  };

  button.addEventListener('click', onToggleClick);

  try {
    const drawerBtn = document.getElementById('push-toggle-drawer');
    if (drawerBtn && drawerBtn !== button) {
      drawerBtn.addEventListener('click', onToggleClick);
    }
  } catch (e) {}
}
