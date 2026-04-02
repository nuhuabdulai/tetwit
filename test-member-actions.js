const http = require('http');
const jwt = require('jsonwebtoken');

// Configuration
const BASE_URL = 'http://localhost:8080';
const JWT_SECRET = 'your-secret-key-change-in-production'; // Should match server.js

// Simple cookie storage: Map<domain, cookieString>
const cookieStore = new Map();

// Test credentials
const adminCredentials = {
  email: 'admin@tetwit.org',
  password: 'Admin@TeTWIT2024!'
};

const clientCredentials = {
  email: 'client1@tetwit.org',
  password: 'Client1@TeTWIT2024!'
};

// Cache for CSRF tokens per user
const csrfTokenCache = new Map();

// Helper function to fetch CSRF token
async function fetchCsrfToken(token) {
  // Check cache first
  if (csrfTokenCache.has(token)) {
    return csrfTokenCache.get(token);
  }

  return new Promise((resolve, reject) => {
    const url = new URL('/api/csrf-token', BASE_URL);
    const options = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    // Add cookies if available
    const domainCookies = cookieStore.get(url.hostname);
    if (domainCookies) {
      options.headers['Cookie'] = domainCookies;
    }

    const req = http.request(options, (res) => {
      // Store cookies from response
      const setCookieHeader = res.headers['set-cookie'];
      if (setCookieHeader) {
        // Merge with existing cookies
        const existing = cookieStore.get(url.hostname) || '';
        const newCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const cookieParts = newCookies.map(c => c.split(';')[0]); // Remove attributes
        const merged = [...existing.split(';').filter(Boolean), ...cookieParts]
          .filter((v, i, a) => a.indexOf(v) === i) // dedupe
          .join('; ');
        cookieStore.set(url.hostname, merged);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.csrfToken) {
            csrfTokenCache.set(token, json.csrfToken);
            resolve(json.csrfToken);
          } else {
            reject(new Error('No CSRF token in response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Helper function to make HTTP requests
async function makeRequest(method, path, token = null, body = null, useCsrf = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add cookies if available
    const domainCookies = cookieStore.get(url.hostname);
    if (domainCookies) {
      options.headers['Cookie'] = domainCookies;
    }

    // For unsafe methods, fetch and add CSRF token if requested
    if (useCsrf && token && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      fetchCsrfToken(token).then(csrfToken => {
        options.headers['X-CSRF-Token'] = csrfToken;
        sendRequest();
      }).catch(reject);
    } else {
      sendRequest();
    }

    function sendRequest() {
      const req = http.request(options, (res) => {
        // Store cookies from response
        const setCookieHeader = res.headers['set-cookie'];
        if (setCookieHeader) {
          const existing = cookieStore.get(url.hostname) || '';
          const newCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          const cookieParts = newCookies.map(c => c.split(';')[0]); // Remove attributes
          const merged = [...existing.split(';').filter(Boolean), ...cookieParts]
            .filter((v, i, a) => a.indexOf(v) === i) // dedupe
            .join('; ');
          cookieStore.set(url.hostname, merged);
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, data: json, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: data, headers: res.headers });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    }
  });
}

// Test login and get token
async function login(credentials) {
  try {
    const response = await makeRequest('POST', '/api/auth/login', null, credentials);
    return response;
  } catch (error) {
    console.error('Login error:', error.message);
    return { status: 0, data: { success: false, message: error.message } };
  }
}

// Test GET /api/members/:id
async function testGetMember(token, memberId) {
  try {
    const response = await makeRequest('GET', `/api/members/${memberId}`, token);
    return response;
  } catch (error) {
    console.error(`Get member ${memberId} error:`, error.message);
    return { status: 0, data: { success: false, message: error.message } };
  }
}

// Test DELETE /api/members/:id
async function testDeleteMember(token, memberId) {
  try {
    const response = await makeRequest('DELETE', `/api/members/${memberId}`, token, null, true);
    return response;
  } catch (error) {
    console.error(`Delete member ${memberId} error:`, error.message);
    return { status: 0, data: { success: false, message: error.message } };
  }
}

// Main test execution
async function runTests() {
  console.log('🔍 Testing Member Management API Endpoints\n');
  console.log('='.repeat(60));

  // Step 1: Login as admin
  console.log('\n📝 Step 1: Admin login');
  const adminLogin = await login(adminCredentials);
  console.log(`Status: ${adminLogin.status}`);
  console.log(`Response:`, JSON.stringify(adminLogin.data, null, 2));

  if (!adminLogin.data.success) {
    console.error('❌ Admin login failed. Cannot proceed with tests.');
    process.exit(1);
  }

  const adminToken = adminLogin.data.token;
  console.log(`✅ Admin token obtained: ${adminToken.substring(0, 20)}...`);

  // Step 2: Test GET /api/members/:id for admin (ID 8)
  console.log('\n📝 Step 2: GET /api/members/8 (admin viewing own profile)');
  const getAdminSelf = await testGetMember(adminToken, 8);
  console.log(`Status: ${getAdminSelf.status}`);
  console.log(`Success: ${getAdminSelf.data.success}`);
  if (getAdminSelf.data.success) {
    console.log(`✅ Admin self-view works`);
  } else {
    console.log(`❌ Admin self-view failed: ${getAdminSelf.data.message}`);
  }

  // Step 3: Test GET /api/members/:id for client (ID 9) as admin
  console.log('\n📝 Step 3: GET /api/members/9 (admin viewing client)');
  const getClient = await testGetMember(adminToken, 9);
  console.log(`Status: ${getClient.status}`);
  console.log(`Success: ${getClient.data.success}`);
  if (getClient.data.success) {
    console.log(`✅ Admin can view client member`);
  } else {
    console.log(`❌ Admin cannot view client: ${getClient.data.message}`);
  }

  // Step 4: Login as client
  console.log('\n📝 Step 4: Client login');
  const clientLogin = await login(clientCredentials);
  console.log(`Status: ${clientLogin.status}`);
  console.log(`Response:`, JSON.stringify(clientLogin.data, null, 2));

  if (!clientLogin.data.success) {
    console.error('❌ Client login failed.');
    process.exit(1);
  }

  const clientToken = clientLogin.data.token;
  console.log(`✅ Client token obtained`);

  // Step 5: Test GET /api/members/:id for client viewing own profile
  console.log('\n📝 Step 5: GET /api/members/9 (client viewing own profile)');
  const getClientSelf = await testGetMember(clientToken, 9);
  console.log(`Status: ${getClientSelf.status}`);
  console.log(`Success: ${getClientSelf.data.success}`);
  if (getClientSelf.data.success) {
    console.log(`✅ Client self-view works`);
  } else {
    console.log(`❌ Client self-view failed: ${getClientSelf.data.message}`);
  }

  // Step 6: Test GET /api/members/:id for client viewing admin (should fail)
  console.log('\n📝 Step 6: GET /api/members/8 (client viewing admin - should fail)');
  const getAdminByClient = await testGetMember(clientToken, 8);
  console.log(`Status: ${getAdminByClient.status}`);
  console.log(`Success: ${getAdminByClient.data.success}`);
  if (getAdminByClient.status === 403) {
    console.log(`✅ Client correctly denied access to admin profile`);
  } else {
    console.log(`❌ Expected 403 but got ${getAdminByClient.status}: ${getAdminByClient.data.message}`);
  }

  // Step 7: Test DELETE /api/members/:id for admin deleting client (should work)
  console.log('\n📝 Step 7: DELETE /api/members/9 (admin deleting client)');
  const deleteClient = await testDeleteMember(adminToken, 9);
  console.log(`Status: ${deleteClient.status}`);
  console.log(`Success: ${deleteClient.data.success}`);
  console.log(`Message: ${deleteClient.data.message}`);
  if (deleteClient.status === 200 && deleteClient.data.success) {
    console.log(`✅ Admin can delete client member`);
  } else {
    console.log(`❌ Admin delete failed: ${deleteClient.data.message} (status: ${deleteClient.status})`);
  }

  // Step 8: Test DELETE /api/members/:id for admin self-delete (should fail)
  console.log('\n📝 Step 8: DELETE /api/members/8 (admin self-delete - should fail)');
  const deleteSelf = await testDeleteMember(adminToken, 8);
  console.log(`Status: ${deleteSelf.status}`);
  console.log(`Success: ${deleteSelf.data.success}`);
  if (deleteSelf.status === 400 && deleteSelf.data.message.includes('Cannot delete your own account')) {
    console.log(`✅ Admin correctly prevented from self-delete`);
  } else {
    console.log(`❌ Expected 400 with self-delete prevention but got ${deleteSelf.status}: ${deleteSelf.data.message}`);
  }

  // Step 9: Test DELETE /api/members/:id for client (should fail)
  console.log('\n📝 Step 9: DELETE /api/members/8 (client attempting delete - should fail)');
  const deleteByClient = await testDeleteMember(clientToken, 8);
  console.log(`Status: ${deleteByClient.status}`);
  console.log(`Success: ${deleteByClient.data.success}`);
  if (deleteByClient.status === 403) {
    console.log(`✅ Client correctly denied delete permission`);
  } else {
    console.log(`❌ Expected 403 but got ${deleteByClient.status}: ${deleteByClient.data.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All API endpoint tests completed');
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
