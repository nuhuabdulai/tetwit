const http = require('http');

async function test() {
  const agent = new http.Agent({ keepAlive: true });
  
  function request(options, body) {
    return new Promise((resolve, reject) => {
      options.agent = agent;
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ headers: res.headers, data: JSON.parse(data), status: res.statusCode });
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  // Step 1: Login
  console.log('=== LOGIN ===');
  const loginRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@tetwit.org', password: 'ul|W(xZOc27-V,Gw' });
  
  const token = loginRes.data.token;
  console.log('Token:', token);
  
  // Step 2: Get CSRF token
  console.log('\n=== FETCH CSRF TOKEN ===');
  const csrfRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/csrf-token',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  // Get BOTH values
  const csrfTokenFromBody = csrfRes.data.csrfToken;
  console.log('CSRF from body:', csrfTokenFromBody);
  console.log('All cookies in response:', csrfRes.headers['set-cookie']);
  
  // Step 3: Try POST logout with X-CSRF-Token header (use body token)
  console.log('\n=== POST LOGOUT WITH X-CSRF-TOKEN HEADER (body token) ===');
  const postRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'X-CSRF-Token': csrfTokenFromBody
    }
  });
  console.log('Status:', postRes.status);
  console.log('Response:', postRes.data);
}

test().catch(console.error);
