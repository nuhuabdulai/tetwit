const fs = require('fs');
const path = require('path');
const APIClient = require('./api-client');
const Assert = require('./assert');
const config = require('../config');

/**
 * Base Test Suite class
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeAll = [];
    this.afterAll = [];
    this.beforeEach = [];
    this.afterEach = [];
    this.client = new APIClient(config.server.baseURL);
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Register a test
   */
  test(description, fn) {
    this.tests.push({ description, fn });
  }

  /**
   * Register hooks
   */
  async runHooks(hooks) {
    for (const hook of hooks) {
      await hook.call(this);
    }
  }

  /**
   * Run all tests in this suite
   */
  async run() {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📦 Test Suite: ${this.name}`);
    console.log(`${'='.repeat(70)}\n`);

    this.results.startTime = new Date();

    try {
      await this.runHooks(this.beforeAll);
    } catch (error) {
      console.error(`❌ Before all hook failed: ${error.message}`);
      this.results.errors.push({ type: 'beforeAll', error: error.message });
      return this.results;
    }

    for (const test of this.tests) {
      await this.runTest(test);
    }

    try {
      await this.runHooks(this.afterAll);
    } catch (error) {
      console.error(`❌ After all hook failed: ${error.message}`);
    }

    this.results.endTime = new Date();
    this.printSummary();
    return this.results;
  }

  /**
   * Run a single test
   */
  async runTest(test) {
    await this.client.clear();

    try {
      await this.runHooks(this.beforeEach);
    } catch (error) {
      console.error(`❌ Before each hook failed for "${test.description}": ${error.message}`);
      this.results.failed++;
      this.results.errors.push({
        test: test.description,
        error: `Before each hook: ${error.message}`,
      });
      return;
    }

    try {
      await test.fn.call(this);
      this.results.passed++;
      console.log(`  ✅ ${test.description}`);
    } catch (error) {
      this.results.failed++;
      console.log(`  ❌ ${test.description}`);
      console.log(`     Error: ${error.message}`);
      this.results.errors.push({
        test: test.description,
        error: error.message,
        stack: error.stack,
      });
    }

    try {
      await this.runHooks(this.afterEach);
    } catch (error) {
      console.error(`❌ After each hook failed for "${test.description}": ${error.message}`);
    }
  }

  /**
   * Print summary
   */
  printSummary() {
    const duration = this.results.endTime - this.results.startTime;
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📊 Results: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.skipped} skipped`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`${'─'.repeat(70)}\n`);
  }
}

module.exports = TestSuite;
