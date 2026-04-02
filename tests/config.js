/**
 * Test Configuration
 */
module.exports = {
  // Server configuration
  server: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:8080',
    timeout: 10000, // 10 seconds
    retries: 3,
  },

  // Test credentials (use test accounts)
  credentials: {
    admin: {
      email: 'admin@tetwit.org',
      password: 'ul|W(xZOc27-V,Gw',
    },
    client: {
      email: 'client1@tetwit.org',
      password: 'ijcpS+ywyN*NsE-5',
    },
  },

  // Test execution settings
  execution: {
    parallel: false, // Run tests sequentially for now
    verbose: true,
    screenshotOnFailure: false, // Not applicable for API tests
  },

  // Reporting
  reporting: {
    outputDir: './test-reports',
    formats: ['html', 'json', 'console'],
    keepHistory: 30, // days
  },

  // Monitoring
  monitoring: {
    enabled: true,
    checkInterval: 60 * 60 * 1000, // 1 hour
    alertEmail: process.env.ALERT_EMAIL || '',
    slackWebhook: process.env.SLACK_WEBHOOK || '',
  },

  // Paths
  paths: {
    tests: './tests/suites',
    utils: './tests/utils',
    reports: './test-reports',
    logs: './test-logs',
    screenshots: './test-screenshots',
  },

  // Button test configuration
  buttonTests: {
    validateClickEvent: true,
    validateAPICall: true,
    validateResponse: true,
    validateUIRedraw: false, // Not applicable for API-only tests
  },
};
