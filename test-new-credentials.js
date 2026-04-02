const http = require('http');

// Credentials to test
const testCredentials = [
  { email: 'admin@tetwit.org', password: 'ul|W(xZOc27-V,Gw', role: 'admin' },
  { email: 'client1@tetwit.org', password: 'ijcpS+ywyN*NsE-5', role: 'member' }
];

const BASE_URL = 'http://localhost:8080';

function makeRequest(path, method = 'POST', body = null) {
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testLogin(credentials) {
  try {
    const response = await makeRequest('/api/auth/login', 'POST', {
      email: credentials.email,
      password: credentials.password
    });

    if (response.data.success) {
      console.log(`✅ ${credentials.role.toUpperCase()} login successful: ${credentials.email}`);
      return true;
    } else {
      console.log(`❌ ${credentials.role.toUpperCase()} login failed: ${credentials.email}`);
      console.log(`   Error: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${credentials.role.toUpperCase()} login error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔐 Testing New Login Credentials');
  console.log('='.repeat(70));
  console.log('');

  let allPassed = true;

  for (const creds of testCredentials) {
    const passed = await testLogin(creds);
    if (!passed) allPassed = false;
    console.log('');
  }

  console.log('='.repeat(70));
  if (allPassed) {
    console.log('✅ All credentials are valid and working!');
  } else {
    console.log('❌ Some credentials failed verification');
  }
  console.log('='.repeat(70));

  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error);
