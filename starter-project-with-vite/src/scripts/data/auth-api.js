import CONFIG from '../config';

const AuthService = {
  async register(userData) {
    try {
      const response = await fetch(`${CONFIG.API_ENDPOINT}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      throw new Error(`Register gagal: ${err.message}`);
    }
  },

  async login(credentials) {
    try {
      const response = await fetch(`${CONFIG.API_ENDPOINT}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      return data.loginResult;
    } catch (err) {
      throw new Error(`Login gagal: ${err.message}`);
    }
  },
};

export default AuthService;
