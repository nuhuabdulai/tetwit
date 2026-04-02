const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Install test dependencies
 */
function installDependencies() {
  console.log('📦 Installing test dependencies...');
  
  try {
    // Install dependencies from tests/package.json
    execSync('npm install', {
      cwd: path.join(__dirname, 'tests'),
      stdio: 'inherit'
    });
    console.log('✅ Dependencies installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

/**
 * Run test suite
 */
function runTests() {
  console.log('🧪 Running automated tests...\n');
  
  try {
    execSync('node tests/runner.js --all', {
      stdio: 'inherit'
    });
    console.log('✅ All tests completed');
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
    process.exit(1);
  }
}

/**
 * Generate HTML report
 */
function generateReport() {
  console.log('📊 Generating test report...');
  
  try {
    execSync('node tests/generate-report.js', {
      stdio: 'inherit'
    });
    console.log('✅ Report generated in test-reports/');
  } catch (error) {
    console.error('❌ Failed to generate report:', error.message);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'install':
      installDependencies();
      break;
    case 'test':
      runTests();
      break;
    case 'report':
      generateReport();
      break;
    case 'all':
      installDependencies();
      runTests();
      generateReport();
      break;
    default:
      console.log(`
Usage: node setup-tests.js [command]

Commands:
  install  - Install test dependencies
  test     - Run all tests
  report   - Generate HTML report
  all      - Run install, test, and report

Examples:
  node setup-tests.js install
  node setup-tests.js test
  node setup-tests.js all
      `);
  }
}

main();
