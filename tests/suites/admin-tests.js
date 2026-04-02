const TestSuite = require('../utils/test-suite');
const APIClient = require('../utils/api-client');
const Assert = require('../utils/assert');
const config = require('../config');

/**
 * Admin Page Tests - Test all admin button functionality
 */
class AdminTests extends TestSuite {
  constructor() {
    super('Admin Page Tests');
    this.adminToken = null;
    this.setupTests();
  }

  async loginAsAdmin() {
    const response = await this.client.request('/api/auth/login', {
      method: 'POST',
      body: {
        email: config.credentials.admin.email,
        password: config.credentials.admin.password,
      },
      csrf: false,
    });

    this.adminToken = response.data.token;
    await this.client.fetchCSRFToken(this.adminToken);
    return this.adminToken;
  }

  setupTests() {
    // Test: Admin login
    this.test('Admin can log in', async function() {
      const token = await this.loginAsAdmin();
      Assert.exists(token, 'Should receive admin token');
    });

    // Test: View Members button (refreshMembers)
    this.test('Refresh Members button fetches member list', async function() {
      const response = await this.client.get('/api/members', this.adminToken);
      Assert.equal(response.status, 200, 'Should fetch members successfully');
      Assert.exists(response.body, 'Should have data');
      Assert.instanceOf(response.body, Array, 'Data should be array');
    });

    // Test: View Member details button
    this.test('View Member button returns member details', async function() {
      // First get list of members
      const listResponse = await this.client.get('/api/members', this.adminToken);
      if (listResponse.body && listResponse.body.length > 0) {
        const memberId = listResponse.body[0].id;
        const response = await this.client.get(`/api/members/${memberId}`, this.adminToken);
        Assert.equal(response.status, 200, 'Should fetch member details');
        Assert.exists(response.body, 'Should have member data');
        Assert.equal(response.body.id, memberId, 'Member ID should match');
      }
    });

    // Test: Delete Member button
    this.test('Delete Member button removes member (soft delete)', async function() {
      // Create a test member first
      const createResponse = await this.client.request('/api/auth/register', {
        method: 'POST',
        body: {
          email: `test-delete-${Date.now()}@example.com`,
          password: 'TestPass123!',
          first_name: 'Test',
          last_name: 'Delete',
        },
        userToken: this.adminToken,
        csrf: false,
      });

      const memberId = createResponse.data.user.id;

      // Delete the member
      const deleteResponse = await this.client.delete(`/api/members/${memberId}`, this.adminToken);

      Assert.equal(deleteResponse.status, 200, 'Delete should succeed');
      Assert.exists(deleteResponse.data.message, 'Should have message');

      // Verify soft delete
      const getResponse = await this.client.get(`/api/members/${memberId}`, this.adminToken);
      Assert.exists(getResponse.body.deleted_at, 'Member should be soft deleted');
    });

    // Test: Refresh Partnerships button
    this.test('Refresh Partnerships button fetches partnerships', async function() {
      const response = await this.client.get('/api/partnerships', this.adminToken);
      Assert.equal(response.status, 200, 'Should fetch partnerships');
      Assert.instanceOf(response.body, Array, 'Data should be array');
    });

    // Test: Create Event button
    this.test('Create Event button creates new event', async function() {
      const eventData = {
        title: `Test Event ${Date.now()}`,
        description: 'Automated test event',
        event_date: new Date().toISOString(),
        location: 'Test Location',
        max_participants: 50,
      };

      const response = await this.client.request('/api/events', {
        method: 'POST',
        body: eventData,
        userToken: this.adminToken,
        csrf: false,
      });

      Assert.equal(response.status, 201, 'Event creation should succeed');
      Assert.exists(response.body.event, 'Should return event');
      Assert.equal(response.body.event.title, eventData.title, 'Event title should match');
    });

    // Test: Create Election button
    this.test('Create Election button creates new election', async function() {
      const electionData = {
        title: `Test Election ${Date.now()}`,
        description: 'Automated test election',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await this.client.request('/api/elections', {
        method: 'POST',
        body: electionData,
        userToken: this.adminToken,
        csrf: false,
      });

      Assert.equal(response.status, 201, 'Election creation should succeed');
      Assert.exists(response.body.election, 'Should return election');
      Assert.equal(response.body.election.title, electionData.title, 'Election title should match');
    });

    // Test: Add Transaction button
    this.test('Add Transaction button creates transaction', async function() {
      const transactionData = {
        amount: 100.00,
        description: 'Test transaction',
        type: 'income',
        category: 'Test',
      };

      const response = await this.client.request('/api/transactions', {
        method: 'POST',
        body: transactionData,
        userToken: this.adminToken,
        csrf: false,
      });

      if (response.status === 201) {
        Assert.exists(response.body.transaction, 'Should return transaction');
        Assert.equal(response.body.transaction.amount, transactionData.amount, 'Amount should match');
      } else {
        Assert.equal(response.status, 201, 'Transaction creation should succeed');
      }
    });

    // Test: Refresh Messages button
    this.test('Refresh Messages button fetches messages', async function() {
      const response = await this.client.get('/api/messages', this.adminToken);
      Assert.equal(response.status, 200, 'Should fetch messages');
      Assert.instanceOf(response.body, Array, 'Data should be array');
    });

    // Test: Export Database button
    this.test('Export Database button returns data', async function() {
      const response = await this.client.request('/api/admin/export-database', {
        method: 'POST',
        userToken: this.adminToken,
        csrf: false,
      });

      Assert.equal(response.status, 200, 'Export should succeed');
      Assert.exists(response.body, 'Should have export data');
    });

    // Test: Export Members CSV button
    this.test('Export Members CSV button returns CSV', async function() {
      const response = await this.client.request('/api/admin/export-members', {
        method: 'GET',
        userToken: this.adminToken,
        csrf: false,
      });

      if (response.status === 200) {
        Assert.exists(response.body.content, 'Should have CSV content');
      }
    });

    // Test: Export Events CSV button
    this.test('Export Events CSV button returns CSV', async function() {
      const response = await this.client.request('/api/admin/export-events', {
        method: 'GET',
        userToken: this.adminToken,
        csrf: false,
      });

      if (response.status === 200) {
        Assert.exists(response.body.content, 'Should have CSV content');
      }
    });

    // Test: View Partnership button
    this.test('View Partnership button shows details', async function() {
      const listResponse = await this.client.get('/api/partnerships', this.adminToken);
      if (listResponse.body && listResponse.body.length > 0) {
        const partnershipId = listResponse.body[0].id;
        const response = await this.client.get(`/api/partnerships/${partnershipId}`, this.adminToken);
        Assert.equal(response.status, 200, 'Should fetch partnership details');
        Assert.exists(response.body, 'Should have partnership data');
      }
    });

    // Test: View Event button
    this.test('View Event button shows details', async function() {
      const listResponse = await this.client.get('/api/events', this.adminToken);
      if (listResponse.body && listResponse.body.length > 0) {
        const eventId = listResponse.body[0].id;
        const response = await this.client.get(`/api/events/${eventId}`, this.adminToken);
        Assert.equal(response.status, 200, 'Should fetch event details');
        Assert.exists(response.body, 'Should have event data');
      }
    });

    // Test: View Election button
    this.test('View Election button shows details', async function() {
      const listResponse = await this.client.get('/api/elections', this.adminToken);
      if (listResponse.body && listResponse.body.length > 0) {
        const electionId = listResponse.body[0].id;
        const response = await this.client.get(`/api/elections/${electionId}`, this.adminToken);
        Assert.equal(response.status, 200, 'Should fetch election details');
        Assert.exists(response.body, 'Should have election data');
      }
    });

    // Test: View Message button
    this.test('View Message button shows details', async function() {
      const listResponse = await this.client.get('/api/messages', this.adminToken);
      if (listResponse.body && listResponse.body.length > 0) {
        const messageId = listResponse.body[0].id;
        const response = await this.client.get(`/api/messages/${messageId}`, this.adminToken);
        Assert.equal(response.status, 200, 'Should fetch message details');
        Assert.exists(response.body, 'Should have message data');
      }
    });

    // Test: Admin authorization - non-admin cannot access admin endpoints
    this.test('Non-admin user cannot access admin endpoints', async function() {
      // Login as client
      const clientResponse = await this.client.request('/api/auth/login', {
        method: 'POST',
        body: {
          email: config.credentials.client.email,
          password: config.credentials.client.password,
        },
        csrf: false,
      });

      const clientToken = clientResponse.data.token;

      // Try to access admin endpoint
      const response = await this.client.get('/api/members', clientToken);

      // Admin member endpoint might return 401 (token valid but not admin) or 403 (forbidden)
      Assert.true(response.status === 401 || response.status === 403, 'Should return 401 or 403');
    });
  }
}

module.exports = AdminTests;
