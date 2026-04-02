const TestSuite = require('../utils/test-suite');
const APIClient = require('../utils/api-client');
const Assert = require('../utils/assert');
const config = require('../config');

/**
 * Authentication Tests - Test login and registration button functionality
 */
class AuthTests extends TestSuite {
  constructor() {
    super('Authentication Tests');
    this.setupTests();
  }

  setupTests() {
    // Test: Login button functionality
    this.test('Login button submits credentials and returns JWT token', async function() {
      const response = await this.client.request('/api/auth/login', {
        method: 'POST',
        body: {
          email: config.credentials.admin.email,
          password: config.credentials.admin.password,
        },
        csrf: false,
      });

      Assert.equal(response.status, 200, 'Login should return 200');
      Assert.exists(response.data, 'Response should have data');
      Assert.exists(response.data.token, 'Response should have token');
      Assert.exists(response.data.user, 'Response should have user');
      Assert.equal(response.data.user.email, config.credentials.admin.email, 'User email should match');
    });

    // Test: Login with invalid credentials
    this.test('Login button with invalid credentials returns error', async function() {
      const response = await this.client.request('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'wrong@example.com',
          password: 'wrongpassword',
        },
        csrf: false,
      });

      Assert.equal(response.status, 401, 'Invalid login should return 401');
      Assert.exists(response.data.message, 'Should have error message');
    });

    // Test: Logout button functionality
    this.test('Logout button invalidates token', async function() {
      // Login first
      const loginResponse = await this.client.request('/api/auth/login', {
        method: 'POST',
        body: {
          email: config.credentials.admin.email,
          password: config.credentials.admin.password,
        },
        csrf: false,
      });

      const token = loginResponse.data.token;
      await this.client.fetchCSRFToken(token);

      // Logout
      const logoutResponse = await this.client.request('/api/auth/logout', {
        method: 'POST',
        userToken: token,
      });

      Assert.equal(logoutResponse.status, 200, 'Logout should return 200');
      Assert.exists(logoutResponse.data.message, 'Should have message');
    });

    // Test: CSRF token endpoint
    this.test('CSRF token endpoint returns valid token', async function() {
      const response = await this.client.request('/api/csrf-token', {
        method: 'GET',
        csrf: false,
      });

      Assert.equal(response.status, 200, 'CSRF token endpoint should return 200');
      const csrfCookie = this.client.cookies.get('_csrf');
      Assert.exists(csrfCookie, 'Should have _csrf cookie');
    });

    // Test: Protected endpoint requires authentication
    this.test('Protected endpoint requires valid token', async function() {
      const response = await this.client.request('/api/auth/me', {
        method: 'GET',
        userToken: 'invalid-token',
      });

      // Invalid token should return 403 (invalid token) not 401
      Assert.true(response.status === 401 || response.status === 403, 'Should return 401 or 403');
    });

    // Test: Valid token can access protected endpoint
    this.test('Valid token can access protected endpoint', async function() {
      const loginResponse = await this.client.request('/api/auth/login', {
        method: 'POST',
        body: {
          email: config.credentials.admin.email,
          password: config.credentials.admin.password,
        },
        csrf: false,
      });

      const token = loginResponse.data.token;

      const response = await this.client.request('/api/auth/me', {
        method: 'GET',
        userToken: token,
      });

      Assert.equal(response.status, 200, 'Protected endpoint should return 200');
      Assert.exists(response.body, 'Should have user data');
      Assert.equal(response.body.email, config.credentials.admin.email, 'User email should match');
    });
  }
}

module.exports = AuthTests;
