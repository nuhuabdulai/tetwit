const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');
const AdminTests = require('./suites/admin-tests');
const DashboardTests = require('./suites/dashboard-tests');
const AuthTests = require('./suites/auth-tests');
const config = require('./config');
const logger = require('./utils/logger');

/**
 * Main Test Runner
 */
class TestRunner {
  constructor() {
    this.suites = [];
    this.allResults = {
      totalSuites: 0,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: null,
      endTime: null,
      suiteResults: [],
    };
    this.reportDir = config.reporting.outputDir;
  }

  /**
   * Register test suites
   */
  registerSuites() {
    this.suites.push(new AdminTests());
    this.suites.push(new DashboardTests());
    this.suites.push(new AuthTests());
    this.allResults.totalSuites = this.suites.length;
  }

  /**
   * Ensure report directory exists
   */
  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Run all test suites
   */
  async runAll() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TE T W I T   A U T O M A T E D   T E S T   F R A M E W O R K');
    console.log('═'.repeat(70) + '\n');

    this.ensureReportDir();
    this.allResults.startTime = performance.now();

    logger.info('Starting test run', { timestamp: new Date().toISOString() });

    for (const suite of this.suites) {
      const suiteResult = await suite.run();
      this.allResults.suiteResults.push({
        name: suite.name,
        ...suiteResult,
      });

      this.allResults.totalTests += suiteResult.passed + suiteResult.failed + suiteResult.skipped;
      this.allResults.passed += suiteResult.passed;
      this.allResults.failed += suiteResult.failed;
      this.allResults.skipped += suiteResult.skipped;
      this.allResults.errors.push(...suiteResult.errors);
    }

    this.allResults.endTime = performance.now();
    this.printFinalSummary();
    this.saveResults();
    this.checkForFailures();

    return this.allResults;
  }

  /**
   * Print final summary
   */
  printFinalSummary() {
    const duration = (this.allResults.endTime - this.allResults.startTime).toFixed(2);
    const successRate = ((this.allResults.passed / this.allResults.totalTests) * 100).toFixed(1);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total Suites:   ${this.allResults.totalSuites}`);
    console.log(`Total Tests:    ${this.allResults.totalTests}`);
    console.log(`✅ Passed:      ${this.allResults.passed}`);
    console.log(`❌ Failed:      ${this.allResults.failed}`);
    console.log(`⏭️  Skipped:     ${this.allResults.skipped}`);
    console.log(`📈 Success:     ${successRate}%`);
    console.log(`⏱️  Duration:    ${duration}ms`);
    console.log('═'.repeat(70) + '\n');

    if (this.allResults.failed > 0) {
      console.log('❌ FAILED TESTS:');
      this.allResults.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.test || 'Unknown test'}`);
        console.log(`     Error: ${err.error}`);
      });
      console.log('');
    }
  }

  /**
   * Save results to files
   */
  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(this.reportDir, `test-results-${timestamp}.json`);
    const htmlPath = path.join(this.reportDir, `test-report-${timestamp}.html`);

    // Save JSON
    fs.writeFileSync(jsonPath, JSON.stringify(this.allResults, null, 2));
    console.log(`📄 JSON report saved: ${jsonPath}`);

    // Save HTML
    this.generateHTMLReport(htmlPath);
    console.log(`🌐 HTML report saved: ${htmlPath}`);

    // Save latest for CI
    fs.writeFileSync(path.join(this.reportDir, 'latest.json'), JSON.stringify(this.allResults, null, 2));
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(filePath) {
    const timestamp = new Date().toLocaleString();
    const successRate = ((this.allResults.passed / this.allResults.totalTests) * 100).toFixed(1);
    const statusColor = this.allResults.failed === 0 ? '#10b981' : '#ef4444';
    const statusText = this.allResults.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TeTWIT Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 2rem; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8fafc;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #4f46e5;
    }
    .stat-card .label {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 5px;
    }
    .status-banner {
      background: ${statusColor};
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: bold;
    }
    .suites {
      padding: 30px;
    }
    .suite {
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .suite-header {
      background: #e2e8f0;
      padding: 15px 20px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
    }
    .suite-tests {
      padding: 20px;
    }
    .test {
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
    }
    .test:last-child { border-bottom: none; }
    .test-status {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin-right: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: white;
    }
    .test-status.pass { background: #10b981; }
    .test-status.fail { background: #ef4444; }
    .test-description { flex: 1; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 TeTWIT Automated Test Report</h1>
      <p>Generated: ${timestamp}</p>
    </div>

    <div class="status-banner" style="background: ${statusColor}">
      ${statusText}
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="value">${this.allResults.totalSuites}</div>
        <div class="label">Test Suites</div>
      </div>
      <div class="stat-card">
        <div class="value">${this.allResults.totalTests}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #10b981">${this.allResults.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #ef4444">${this.allResults.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="value">${successRate}%</div>
        <div class="label">Success Rate</div>
      </div>
      <div class="stat-card">
        <div class="value">${(this.allResults.endTime - this.allResults.startTime).toFixed(0)}ms</div>
        <div class="label">Duration</div>
      </div>
    </div>

    <div class="suites">
      <h2>Test Suite Details</h2>
      ${this.allResults.suiteResults.map(suite => `
        <div class="suite">
          <div class="suite-header">
            <span>${suite.name}</span>
            <span>${suite.passed}/${suite.passed + suite.failed} passed</span>
          </div>
          <div class="suite-tests">
            ${suite.tests.map((test, idx) => `
              <div class="test">
                <div class="test-status ${suite.errors[idx] ? 'fail' : 'pass'}">
                  ${suite.errors[idx] ? '✗' : '✓'}
                </div>
                <div class="test-description">${test.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>TeTWIT Automated Testing Framework v1.0</p>
      <p>For questions or issues, contact the development team</p>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(filePath, html);
  }

  /**
   * Check for failures and trigger alerts if configured
   */
  checkForFailures() {
    if (this.allResults.failed > 0) {
      logger.error('Test failures detected', {
        failed: this.allResults.failed,
        total: this.allResults.totalTests,
        errors: this.allResults.errors,
      });

      // Send alerts if configured
      this.sendAlerts();
    } else {
      logger.info('All tests passed successfully');
    }
  }

  /**
   * Send alerts via configured channels
   */
  sendAlerts() {
    const alertEmail = config.monitoring.alertEmail;
    const slackWebhook = config.monitoring.slackWebhook;

    if (alertEmail) {
      this.sendEmailAlert(alertEmail);
    }

    if (slackWebhook) {
      this.sendSlackAlert(slackWebhook);
    }
  }

  /**
   * Send email alert (placeholder - requires SMTP config)
   */
  sendEmailAlert(email) {
    logger.info(`Would send email alert to ${email} (not configured)`);
    // Implementation would use nodemailer with proper SMTP config
  }

  /**
   * Send Slack alert (placeholder - requires webhook)
   */
  sendSlackAlert(webhook) {
    logger.info(`Would send Slack alert to webhook (not configured)`);
    // Implementation would use fetch/axios to post to Slack
  }
}

// Run tests
const runner = new TestRunner();
runner.registerSuites();

// Parse command line args
const args = process.argv.slice(2);
const command = args[0];

if (command === 'ci') {
  // CI mode: exit with non-zero code on failures
  runner.runAll().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    logger.error('Test runner crashed', { error: error.message });
    process.exit(1);
  });
} else {
  // Normal mode
  runner.runAll().then(() => {
    process.exit(0);
  }).catch(error => {
    logger.error('Test runner crashed', { error: error.message });
    process.exit(1);
  });
}
