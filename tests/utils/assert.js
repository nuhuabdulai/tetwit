const chalk = require('chalk');

/**
 * Custom assertion library with detailed error reporting
 */
class Assert {
  static equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected: ${JSON.stringify(expected)}\n` +
        `  Actual:   ${JSON.stringify(actual)}`
      );
    }
  }

  static notEqual(actual, notExpected, message = '') {
    if (actual === notExpected) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Value should not equal: ${JSON.stringify(notExpected)}`
      );
    }
  }

  static true(value, message = '') {
    if (value !== true) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected: true\n` +
        `  Actual:   ${value}`
      );
    }
  }

  static false(value, message = '') {
    if (value !== false) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected: false\n` +
        `  Actual:   ${value}`
      );
    }
  }

  static exists(value, message = '') {
    if (value === null || value === undefined) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected value to exist, but got: ${value}`
      );
    }
  }

  static notExists(value, message = '') {
    if (value !== null && value !== undefined) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected value to not exist, but got: ${JSON.stringify(value)}`
      );
    }
  }

  static contains(array, item, message = '') {
    if (!array.includes(item)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Array does not contain: ${JSON.stringify(item)}\n` +
        `  Array: ${JSON.stringify(array)}`
      );
    }
  }

  static notContains(array, item, message = '') {
    if (array.includes(item)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Array should not contain: ${JSON.stringify(item)}\n` +
        `  Array: ${JSON.stringify(array)}`
      );
    }
  }

  static greaterThan(actual, expected, message = '') {
    if (!(actual > expected)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected: ${actual} > ${expected}`
      );
    }
  }

  static lessThan(actual, expected, message = '') {
    if (!(actual < expected)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected: ${actual} < ${expected}`
      );
    }
  }

  static matches(string, regex, message = '') {
    if (!regex.test(string)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  String does not match pattern ${regex.toString()}\n` +
        `  String: ${string}`
      );
    }
  }

  static instanceOf(value, constructor, message = '') {
    if (!(value instanceof constructor)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected instance of: ${constructor.name}\n` +
        `  Actual type: ${typeof value}`
      );
    }
  }

  static hasProperty(obj, prop, message = '') {
    if (!obj.hasOwnProperty(prop)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Object does not have property: ${prop}\n` +
        `  Object: ${JSON.stringify(obj)}`
      );
    }
  }

  static notHasProperty(obj, prop, message = '') {
    if (obj.hasOwnProperty(prop)) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Object should not have property: ${prop}\n` +
        `  Object: ${JSON.stringify(obj)}`
      );
    }
  }

  static length(array, expectedLength, message = '') {
    if (array.length !== expectedLength) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected length: ${expectedLength}\n` +
        `  Actual length: ${array.length}`
      );
    }
  }

  static atLeast(actual, minimum, message = '') {
    if (actual < minimum) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected at least: ${minimum}\n` +
        `  Actual: ${actual}`
      );
    }
  }

  static atMost(actual, maximum, message = '') {
    if (actual > maximum) {
      throw new Error(
        `${chalk.red('Assertion Failed:')} ${message}\n` +
        `  Expected at most: ${maximum}\n` +
        `  Actual: ${actual}`
      );
    }
  }
}

module.exports = Assert;
