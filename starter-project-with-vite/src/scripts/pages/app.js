import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import Auth from '../utils/auth';
import { showNotification } from '../utils/index';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #authStatus = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#authStatus = document.getElementById('auth-status');

    this.#setupDrawer();
    this.#setupAuthStatus();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    this.#drawerButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#navigationDrawer.classList.toggle('open');
      }
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
    });
  }

  #setupAuthStatus() {
    this.#updateAuthStatus();
    window.addEventListener('hashchange', () => {
      this.#updateAuthStatus();
    });
  }

  #updateAuthStatus() {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      this.#authStatus.innerHTML = `
        <div class="user-info">
          <span>Hai, ${user.name}</span>
          <button class="logout-btn" id="logout-btn">Logout</button>
        </div>
      `;

      document.getElementById('logout-btn').addEventListener('click', () => {
        this.#handleLogout();
      });
    } else {
      this.#authStatus.innerHTML = `
        <a href="#/login" class="auth-btn-header">Masuk</a>
        <a href="#/register" class="auth-btn-header">Daftar</a>
      `;
    }
    const drawerAuth = document.getElementById('auth-status-drawer');
    if (drawerAuth) {
      if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        drawerAuth.innerHTML = `
          <div class="user-info">
            <span>Hai, ${user.name}</span>
            <button class="logout-btn" id="logout-btn-drawer">Logout</button>
          </div>
        `;
        const logoutDrawer = document.getElementById('logout-btn-drawer');
        if (logoutDrawer) {
          logoutDrawer.addEventListener('click', () => this.#handleLogout());
        }
      } else {
        drawerAuth.innerHTML = `
          <a href="#/login" class="auth-btn-header">Masuk</a>
          <a href="#/register" class="auth-btn-header">Daftar</a>
        `;
      }
    }
  }

  #handleLogout() {
    Auth.logout();
    showNotification('Anda telah logout', 'info');
    window.location.hash = '#/';

    setTimeout(() => {
      window.location.reload();
    }, 50);
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    if (!page) {
      this.#content.innerHTML = `
        <section class="error-section">
          <div class="container">
            <h1>404 - Halaman Tidak Ditemukan</h1>
            <p>Halaman yang Anda cari tidak tersedia.</p>
            <a href="#/" class="btn-primary">Kembali ke Beranda</a>
          </div>
        </section>
      `;
      return;
    }

    if (!document.startViewTransition) {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
      return;
    }

    document.startViewTransition(async () => {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
    });
  }
}

export default App;
