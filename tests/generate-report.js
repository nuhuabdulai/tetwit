const path = require('path');
const fs = require('fs');

/**
 * Generate HTML test report from latest results
 */
function generateReport() {
  const reportDir = './test-reports';
  const latestPath = path.join(reportDir, 'latest.json');

  if (!fs.existsSync(latestPath)) {
    console.error('❌ No test results found. Run tests first.');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(reportDir, `test-report-${timestamp}.html`);

  const successRate = ((results.passed / results.totalTests) * 100).toFixed(1);
  const statusColor = results.failed === 0 ? '#10b981' : '#ef4444';
  const statusText = results.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';

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
    .status-banner {
      background: ${statusColor};
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: bold;
    }
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
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="status-banner" style="background: ${statusColor}">
      ${statusText}
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="value">${results.totalSuites}</div>
        <div class="label">Test Suites</div>
      </div>
      <div class="stat-card">
        <div class="value">${results.totalTests}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #10b981">${results.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #ef4444">${results.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="value">${successRate}%</div>
        <div class="label">Success Rate</div>
      </div>
      <div class="stat-card">
        <div class="value">${(results.endTime - results.startTime).toFixed(0)}ms</div>
        <div class="label">Duration</div>
      </div>
    </div>

    <div class="suites">
      <h2>Test Suite Details</h2>
      ${results.suiteResults.map(suite => `
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

  fs.writeFileSync(htmlPath, html);
  console.log(`📊 HTML report generated: ${htmlPath}`);
}

generateReport();
