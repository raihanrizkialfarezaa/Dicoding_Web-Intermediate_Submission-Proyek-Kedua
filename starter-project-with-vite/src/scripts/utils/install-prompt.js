let deferredPrompt = null;
let bannerElement = null;

function createBanner() {
  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.innerHTML = `
    <div class="install-banner__content">
      <div class="install-banner__text">
        <h2>Pasang Dicoding Stories</h2>
        <p>Akses cerita inspiratif langsung dari layar utama Anda.</p>
      </div>
      <div class="install-banner__actions">
        <button type="button" class="install-banner__btn install-banner__btn--install">Pasang</button>
        <button type="button" class="install-banner__btn install-banner__btn--close" aria-label="Tutup">Nanti</button>
      </div>
    </div>
  `;
  return banner;
}

function attachBanner() {
  if (bannerElement) {
    return bannerElement;
  }

  bannerElement = createBanner();
  document.body.appendChild(bannerElement);

  const installBtn = bannerElement.querySelector('.install-banner__btn--install');
  const closeBtn = bannerElement.querySelector('.install-banner__btn--close');

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }

    installBtn.disabled = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideBanner();
  });

  closeBtn.addEventListener('click', () => {
    hideBanner();
  });

  return bannerElement;
}

function hideBanner() {
  if (bannerElement) {
    bannerElement.classList.remove('show');
    setTimeout(() => {
      if (bannerElement) {
        bannerElement.remove();
        bannerElement = null;
      }
    }, 300);
  }
}

function showBanner() {
  const banner = attachBanner();
  requestAnimationFrame(() => {
    banner.classList.add('show');
  });
}

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    showBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideBanner();
  });
}
