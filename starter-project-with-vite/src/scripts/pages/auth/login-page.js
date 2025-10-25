import AuthService from '../../data/auth-api';
import Auth from '../../utils/auth';
import { showNotification } from '../../utils/index';

class AuthLoginPage {
  async render() {
    return `
      <section class="auth-section">
        <div class="container">
          <div class="auth-card">
            <h1>Masuk ke Dicoding Stories</h1>
            <p>Bagikan pengalaman belajar Anda bersama komunitas</p>

            <form id="login-form" class="auth-form" novalidate>
              <div class="form-group">
                <label for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="nama@email.com"
                  aria-required="true"
                />
                <span class="error-message" id="email-error"></span>
              </div>

              <div class="form-group">
                <label for="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  placeholder="Minimal 8 karakter"
                  aria-required="true"
                />
                <span class="error-message" id="password-error"></span>
              </div>

              <div class="form-actions">
                <button type="submit" class="auth-btn" id="login-btn">
                  Masuk
                </button>
              </div>
            </form>

            <div class="auth-links">
              <p>Belum punya akun?
                <a href="#/register" class="auth-link">Daftar di sini</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this._setupForm();
  }

  _setupForm() {
    const form = document.getElementById('login-form');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');

    emailField.addEventListener('input', () => {
      this._validateEmail(emailField);
    });

    passwordField.addEventListener('input', () => {
      this._validatePassword(passwordField);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleLogin();
    });
  }

  _validateEmail(field) {
    const errorId = 'email-error';
    const email = field.value.trim();

    if (!email) {
      this._showError(errorId, 'Email wajib diisi');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this._showError(errorId, 'Format email tidak valid');
      return false;
    }

    this._showError(errorId, '');
    return true;
  }

  _validatePassword(field) {
    const errorId = 'password-error';
    const password = field.value;

    if (!password) {
      this._showError(errorId, 'Password wajib diisi');
      return false;
    }

    if (password.length < 8) {
      this._showError(errorId, 'Password minimal 8 karakter');
      return false;
    }

    this._showError(errorId, '');
    return true;
  }

  _showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  async _handleLogin() {
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');

    let isValid = true;

    if (!this._validateEmail(emailField)) isValid = false;
    if (!this._validatePassword(passwordField)) isValid = false;

    if (!isValid) return;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Sedang Masuk...';

    try {
      const credentials = {
        email: emailField.value.trim(),
        password: passwordField.value,
      };

      const result = await AuthService.login(credentials);

      Auth.saveToken(result.token);
      Auth.saveUser({
        userId: result.userId,
        name: result.name,
      });

      showNotification(`Selamat datang, ${result.name}!`, 'success');

      setTimeout(() => {
        window.location.hash = '#/';
      }, 1000);
    } catch (err) {
      showNotification(err.message, 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Masuk';
    }
  }
}

export default AuthLoginPage;
