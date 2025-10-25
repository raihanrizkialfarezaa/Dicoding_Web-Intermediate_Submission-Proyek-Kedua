import '../styles/styles.css';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

window.L = L;

import App from './pages/app';
import { initPushSubscriptionToggle } from './utils/push-manager';
import { initOfflineSyncWatcher } from './utils/sync-manager';
import { setupInstallPrompt } from './utils/install-prompt';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    return registration;
  } catch (error) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const serviceWorkerRegistration = registerServiceWorker();
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });
  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });

  const pushToggle = document.getElementById('push-toggle');
  serviceWorkerRegistration.then((registration) => {
    if (registration) {
      initPushSubscriptionToggle(pushToggle);
    }
  });
  initOfflineSyncWatcher();
  setupInstallPrompt();
});
