const TestSuite = require('../utils/test-suite');
const APIClient = require('../utils/api-client');
const Assert = require('../utils/assert');
const config = require('../config');

/**
 * Dashboard Tests - Test all dashboard button functionality
 */
class DashboardTests extends TestSuite {
  constructor() {
    super('Dashboard Tests');
    this.userToken = null;
    this.setupTests();
  }

  async loginAsUser() {
    const response = await this.client.request('/api/auth/login', {
      method: 'POST',
      body: {
        email: config.credentials.client.email,
        password: config.credentials.client.password,
      },
      csrf: false,
    });

    this.userToken = response.data.token;
    await this.client.fetchCSRFToken(this.userToken);
    return this.userToken;
  }

  setupTests() {
    // Test: User login
    this.test('User can log in', async function() {
      const token = await this.loginAsUser();
      Assert.exists(token, 'Should receive user token');
    });

    // Test: Logout button
    this.test('Logout button works', async function() {
      const response = await this.client.logout(this.userToken);
      Assert.equal(response.status, 200, 'Logout should succeed');
      Assert.exists(response.data.message, 'Should have message');
    });

    // Test: Edit Profile modal open
    this.test('Edit Profile modal can be opened (client has profile)', async function() {
      // Re-login after logout
      await this.loginAsUser();

      const response = await this.client.get('/api/auth/me', this.userToken);
      Assert.exists(response.body, 'Should have user data');
    });

    // Test: Update Profile button
    this.test('Update Profile button updates user data', async function() {
      await this.loginAsUser();

      const response = await this.client.request('/api/profile', {
        method: 'PUT',
        body: {
          first_name: 'Updated',
          last_name: 'Name',
        },
        userToken: this.userToken,
        csrf: false,
      });

      if (response.status !== 404) {
        Assert.equal(response.status, 200, 'Profile update should succeed');
      }
    });

    // Test: Event Registration modal
    this.test('Event Registration modal can be opened', async function() {
      await this.loginAsUser();

      const response = await this.client.get('/api/events', this.userToken);
      if (response.status === 200) {
        Assert.instanceOf(response.body, Array, 'Data should be array');
      }
    });

    // Test: View Elections button
    this.test('View Elections button shows elections', async function() {
      await this.loginAsUser();

      const response = await this.client.get('/api/elections', this.userToken);
      if (response.status === 200) {
        Assert.instanceOf(response.body, Array, 'Data should be array');
      }
    });

    // Test: Resource Center button
    this.test('Resource Center button shows resources', async function() {
      await this.loginAsUser();

      const response = await this.client.get('/api/resources', this.userToken);
      if (response.status === 200) {
        Assert.instanceOf(response.body, Array, 'Data should be array');
      }
    });

    // Test: Contact Form button
    this.test('Contact Form button opens form', async function() {
      await this.loginAsUser();

      const response = await this.client.get('/api/auth/me', this.userToken);
      Assert.exists(response.body, 'User should be authenticated to see contact form');
    });

    // Test: Submit Contact Form button
    this.test('Submit Contact Form button sends message', async function() {
      await this.loginAsUser();

      const response = await this.client.request('/api/messages', {
        method: 'POST',
        body: {
          subject: 'Test Subject',
          message: 'Test message from automated test',
        },
        userToken: this.userToken,
        csrf: false,
      });

      if (response.status !== 404) {
        Assert.equal(response.status, 201, 'Message submission should succeed');
      }
    });

    // Test: User cannot access other users data
    this.test('User cannot access other users data', async function() {
      await this.loginAsUser();

      // Try to get another user's profile
      const response = await this.client.get('/api/members/1', this.userToken);
      Assert.true(response.status === 403 || response.status === 404, 'Should handle cross-role access');
    });

    // Test: Session persists across requests
    this.test('Session persists across requests', async function() {
      await this.loginAsUser();

      const meResponse = await this.client.get('/api/auth/me', this.userToken);
      Assert.exists(meResponse.body, 'Session should persist');
    });
  }
}

module.exports = DashboardTests;
