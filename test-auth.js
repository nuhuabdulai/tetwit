const http = require('http');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const testLogin = async (email, password, expectedSuccess = true) => {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
    
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          // For successful login: expect 200 and success: true
          // For failed login: expect 401 or 403 and success: false
          const isSuccess = expectedSuccess 
            ? res.statusCode === 200 && result.success === true
            : (res.statusCode === 401 || res.statusCode === 403) && result.success === false;
          resolve({
            success: isSuccess,
            statusCode: res.statusCode,
            data: result
          });
        } catch (e) {
          resolve({
            success: false,
            statusCode: res.statusCode,
            error: 'Failed to parse response',
            raw: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.write(data);
    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Starting Comprehensive Authentication Tests\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let total = 0;
  
  // Test 1: Admin login with correct credentials
  console.log('\n📋 Test 1: Admin login with correct credentials');
  total++;
  try {
    const adminResult = await testLogin('admin@tetwit.org', 'Admin@TeTWIT2024!', true);
    if (adminResult.success) {
      console.log('  ✅ PASS - Admin logged in successfully');
      console.log(`  Token received: ${adminResult.data.token ? 'Yes' : 'No'}`);
      passed++;
    } else {
      console.log('  ❌ FAIL - Admin login failed');
      console.log(`  Status Code: ${adminResult.statusCode}`);
      console.log(`  Response: ${JSON.stringify(adminResult.data)}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  // Wait to avoid rate limiting
  await delay(2000);
  
  // Test 2: Client login with correct credentials
  console.log('\n📋 Test 2: Client login with correct credentials');
  total++;
  try {
    const clientResult = await testLogin('client1@tetwit.org', 'Client1@TeTWIT2024!', true);
    if (clientResult.success) {
      console.log('  ✅ PASS - Client logged in successfully');
      console.log(`  Token received: ${clientResult.data.token ? 'Yes' : 'No'}`);
      passed++;
    } else {
      console.log('  ❌ FAIL - Client login failed');
      console.log(`  Status Code: ${clientResult.statusCode}`);
      console.log(`  Response: ${JSON.stringify(clientResult.data)}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  await delay(2000);
  
  // Test 3: Login with wrong password (should fail)
  console.log('\n📋 Test 3: Login with wrong password (should fail)');
  total++;
  try {
    const wrongPassResult = await testLogin('admin@tetwit.org', 'WrongPassword123!', false);
    if (wrongPassResult.success) {
      console.log('  ✅ PASS - Wrong password correctly rejected');
      passed++;
    } else {
      console.log('  ❌ FAIL - Wrong password was accepted or wrong response');
      console.log(`  Status Code: ${wrongPassResult.statusCode}`);
      console.log(`  Response: ${JSON.stringify(wrongPassResult.data)}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  await delay(2000);
  
  // Test 4: Login with non-existent email (should fail)
  console.log('\n📋 Test 4: Login with non-existent email (should fail)');
  total++;
  try {
    const nonExistResult = await testLogin('nonexistent@test.com', 'Password123!', false);
    if (nonExistResult.success) {
      console.log('  ✅ PASS - Non-existent email correctly rejected');
      passed++;
    } else {
      console.log('  ❌ FAIL - Non-existent email was accepted or wrong response');
      console.log(`  Status Code: ${nonExistResult.statusCode}`);
      console.log(`  Response: ${JSON.stringify(nonExistResult.data)}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  await delay(2000);
  
  // Test 5: Weak password (should fail validation)
  console.log('\n📋 Test 5: Weak password (should fail validation)');
  total++;
  try {
    const weakPassResult = await testLogin('admin@tetwit.org', 'weak', false);
    if (weakPassResult.success) {
      console.log('  ✅ PASS - Weak password correctly rejected');
      passed++;
    } else {
      console.log('  ❌ FAIL - Weak password was accepted or wrong response');
      console.log(`  Status Code: ${weakPassResult.statusCode}`);
      console.log(`  Response: ${JSON.stringify(weakPassResult.data)}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  await delay(2000);
  
  // Test 6: Account lockout - trigger 5 failed attempts
  console.log('\n📋 Test 6: Account lockout mechanism');
  console.log('  Attempting 5 failed logins to trigger lockout...');
  total++;
  let lockoutTriggered = false;
  
  try {
    // Make 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      const result = await testLogin('admin@tetwit.org', `WrongPass${i}!`, false);
      await delay(1000);
      if (!result.success) {
        console.log(`    Attempt ${i}: Rejected (${result.statusCode})`);
      } else {
        console.log(`    Attempt ${i}: Unexpectedly succeeded`);
        break;
      }
    }
    
    // 6th attempt should be locked
    const lockCheck = await testLogin('admin@tetwit.org', 'Admin@TeTWIT2024!', false);
    if (lockCheck.statusCode === 403 && lockCheck.data.locked === true) {
      console.log('  ✅ PASS - Account locked after 5 failed attempts');
      console.log(`  Lock message: "${lockCheck.data.message}"`);
      lockoutTriggered = true;
      passed++;
    } else {
      console.log('  ❌ FAIL - Account not locked properly');
      console.log(`  Status Code: ${lockCheck.statusCode}`);
      console.log(`  Response: ${JSON.stringify(lockCheck.data)}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  await delay(2000);
  
  // Test 7: Verify locked account cannot login even with correct password
  console.log('\n📋 Test 7: Locked account cannot login with correct password');
  total++;
  try {
    const lockedLogin = await testLogin('admin@tetwit.org', 'Admin@TeTWIT2024!', false);
    if (lockedLogin.statusCode === 403 && lockedLogin.data.locked === true) {
      console.log('  ✅ PASS - Locked account correctly rejected');
      passed++;
    } else {
      console.log('  ❌ FAIL - Locked account was able to login or wrong response');
      console.log(`  Status Code: ${lockedLogin.statusCode}`);
    }
  } catch (error) {
    console.log(`  ❌ FAIL - Error: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Total Tests: ${total}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${total - passed}`);
  console.log(`   Success Rate: ${((passed/total)*100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Authentication system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
  
  console.log('\n📝 ACCOUNT CREDENTIALS:');
  console.log('   Admin:  admin@tetwit.org / Admin@TeTWIT2024!');
  console.log('   Client: client1@tetwit.org / Client1@TeTWIT2024!');
  
  process.exit(passed === total ? 0 : 1);
};

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
