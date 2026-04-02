const APIClient = require('./tests/utils/api-client');

async function test() {
  const client = new APIClient('http://localhost:8080');
  
  console.log('=== LOGIN ===');
  const loginRes = await client.login('admin@tetwit.org', 'ul|W(xZOc27-V,Gw');
  console.log('Login successful, token:', loginRes ? loginRes.substring(0, 50) + '...' : 'null');
  
  console.log('\n=== FETCH MEMBERS ===');
  try {
    const membersRes = await client.get('/api/members', loginRes);
    console.log('Status:', membersRes.status);
    console.log('Data type:', typeof membersRes.data);
    console.log('Is array:', Array.isArray(membersRes.data));
    console.log('Data:', JSON.stringify(membersRes.data).substring(0, 200));
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  console.log('\n=== LOGOUT ===');
  try {
    const logoutRes = await client.logout(loginRes);
    console.log('Status:', logoutRes.status);
    console.log('Data:', logoutRes.data);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

test().catch(console.error);
