import AuthService from '../../data/auth-api';
import Auth from '../../utils/auth';
import { showNotification } from '../../utils/index';

class AuthRegisterPage {
  async render() {
    return `
      <section class="auth-section">
        <div class="container">
          <div class="auth-card">
            <h1>Daftar Akun Dicoding Stories</h1>
            <p>Bergabunglah dengan komunitas Dicoding Academy</p>

            <form id="register-form" class="auth-form" novalidate>
              <div class="form-group">
                <label for="name">Nama Lengkap</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Nama lengkap Anda"
                  aria-required="true"
                />
                <span class="error-message" id="name-error"></span>
              </div>

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

              <div class="form-group">
                <label for="confirm-password">Konfirmasi Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  name="confirm-password"
                  required
                  placeholder="Ulangi password Anda"
                  aria-required="true"
                />
                <span class="error-message" id="confirm-password-error"></span>
              </div>

              <div class="form-actions">
                <button type="submit" class="auth-btn" id="register-btn">
                  Daftar
                </button>
              </div>
            </form>

            <div class="auth-links">
              <p>Sudah punya akun?
                <a href="#/login" class="auth-link">Masuk di sini</a>
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
    const form = document.getElementById('register-form');
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm-password');

    nameField.addEventListener('input', () => {
      this._validateName(nameField);
    });

    emailField.addEventListener('input', () => {
      this._validateEmail(emailField);
    });

    passwordField.addEventListener('input', () => {
      this._validatePassword(passwordField);
      this._validateConfirmPassword(confirmPasswordField);
    });

    confirmPasswordField.addEventListener('input', () => {
      this._validateConfirmPassword(confirmPasswordField);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleRegister();
    });
  }

  _validateName(field) {
    const errorId = 'name-error';
    const name = field.value.trim();

    if (!name) {
      this._showError(errorId, 'Nama wajib diisi');
      return false;
    }

    if (name.length < 2) {
      this._showError(errorId, 'Nama minimal 2 karakter');
      return false;
    }

    this._showError(errorId, '');
    return true;
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

  _validateConfirmPassword(field) {
    const errorId = 'confirm-password-error';
    const confirmPassword = field.value;
    const password = document.getElementById('password').value;

    if (!confirmPassword) {
      this._showError(errorId, 'Konfirmasi password wajib diisi');
      return false;
    }

    if (confirmPassword !== password) {
      this._showError(errorId, 'Password yang dimasukkan tidak cocok');
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

  async _handleRegister() {
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm-password');
    const registerBtn = document.getElementById('register-btn');

    let isValid = true;

    if (!this._validateName(nameField)) isValid = false;
    if (!this._validateEmail(emailField)) isValid = false;
    if (!this._validatePassword(passwordField)) isValid = false;
    if (!this._validateConfirmPassword(confirmPasswordField)) isValid = false;

    if (!isValid) return;

    registerBtn.disabled = true;
    registerBtn.textContent = 'Sedang Mendaftar...';

    try {
      const userData = {
        name: nameField.value.trim(),
        email: emailField.value.trim(),
        password: passwordField.value,
      };

      const result = await AuthService.register(userData);

      Auth.saveToken(result.token);
      Auth.saveUser({
        userId: result.userId,
        name: result.name,
      });

      showNotification(`Akun berhasil dibuat! Selamat datang, ${result.name}!`, 'success');

      setTimeout(() => {
        window.location.hash = '#/';
      }, 1000);
    } catch (err) {
      showNotification(err.message, 'error');
      registerBtn.disabled = false;
      registerBtn.textContent = 'Daftar';
    }
  }
}

export default AuthRegisterPage;
