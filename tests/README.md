# TeTWIT Automated Testing Framework

A comprehensive, production-ready automated testing framework for the TeTWIT desktop application. This framework provides server-side test automation with continuous monitoring, detailed reporting, and CI/CD integration.

## Features

- **Complete Button Coverage**: Tests all UI buttons across all application pages
- **Server-Side Execution**: Runs on server infrastructure, no GUI required
- **Continuous Monitoring**: Periodic health checks ensure button functionality
- **Detailed Reporting**: HTML, JSON, and console reports with visual dashboards
- **Alert System**: Email and Slack notifications for test failures
- **CI/CD Integration**: GitHub Actions workflow for automated testing
- **Robust Error Handling**: Comprehensive logging and error recovery
- **CSRF Protection**: Proper handling of CSRF tokens and authentication
- **Modular Architecture**: Easy to extend and maintain

## Quick Start

```bash
# Install test dependencies
node setup-tests.js install

# Run all tests
node setup-tests.js test

# Generate HTML report
node setup-tests.js report

# Or run everything
node setup-tests.js all
```

## Project Structure

```
tests/
├── runner.js              # Main test runner
├── generate-report.js     # Report generator
├── config.js              # Test configuration
├── suites/                # Test suites
│   ├── auth-tests.js      # Authentication tests
│   ├── admin-tests.js     # Admin page tests
│   └── dashboard-tests.js # Dashboard tests
├── utils/                 # Utilities
│   ├── api-client.js      # API client with CSRF handling
│   ├── assert.js          # Custom assertions
│   ├── logger.js          # Winston logger
│   └── test-suite.js      # Base test suite class
├── test-reports/          # Generated reports (auto-created)
└── test-logs/             # Test logs (auto-created)
```

## Test Coverage

The framework tests all button functionality across:

- **Authentication**: Login, logout, CSRF tokens, account lockout
- **Admin Panel**: Member management, event creation, partnerships, elections, transactions, messaging, exports
- **User Dashboard**: Profile editing, event registration, resource access, contact forms
- **Authorization**: Role-based access control validation
- **Edge Cases**: Invalid inputs, missing data, permission errors

## Configuration

Edit `tests/config.js` to customize:

- Server URL and timeout settings
- Test credentials (admin and client)
- Reporting formats and retention
- Monitoring intervals and alert channels
- Button test validation options

## Reports

After running tests, view the HTML report:

```bash
# Open the latest report
open test-reports/test-report-*.html
```

Reports include:
- Overall pass/fail status
- Test suite breakdown
- Individual test results
- Duration and success rate
- Failed test details with error messages

## CI/CD Integration

The framework includes GitHub Actions workflow (`.github/workflows/tests.yml`) that:

- Runs on every push to main/develop
- Runs on pull requests
- Runs daily at 2 AM UTC for continuous monitoring
- Uploads test reports as artifacts
- Notifies on failures

## Monitoring

For continuous monitoring, set up a cron job:

```bash
# Run tests every hour
0 * * * * cd /path/to/project && node tests/runner.js --ci
```

## Requirements

- Node.js 18+
- npm 8+
- Running TeTWIT server (default: http://localhost:3000)

## Documentation

- [Setup Guide](SETUP.md) - Detailed installation and configuration
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Maintenance Guide](MAINTENANCE.md) - Ongoing maintenance procedures

## License

Proprietary - TeTWIT Application
