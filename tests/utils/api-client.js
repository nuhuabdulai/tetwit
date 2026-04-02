const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

/**
 * Comprehensive API client with CSRF token handling, cookie management, and request logging
 */
class APIClient {
  constructor(baseURL = 'http://localhost:8080') {
    this.baseURL = baseURL;
    this.cookies = new Map();
    this.csrfTokens = new Map(); // Cache CSRF tokens per user token
    this.requestLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Set cookies from response headers
   */
  setCookiesFromResponse(headers) {
    const setCookieHeaders = headers['set-cookie'] || headers['Set-Cookie'];
    if (!setCookieHeaders) return;

    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    cookies.forEach(cookieStr => {
      const [cookiePart] = cookieStr.split(';');
      const [key, value] = cookiePart.split('=');
      if (key && value) {
        this.cookies.set(key.trim(), value.trim());
      }
    });
  }

  /**
   * Get cookie string for request
   */
  getCookieString() {
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  /**
   * Make HTTP request with full error handling and logging
   */
  async request(path, options = {}) {
    const url = new URL(path, this.baseURL);
    const startTime = Date.now();

    const requestOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add cookies if available
    const cookieString = this.getCookieString();
    if (cookieString) {
      requestOptions.headers['Cookie'] = cookieString;
    }

    // Add Authorization header if userToken is provided
    if (options.userToken) {
      requestOptions.headers['Authorization'] = 'Bearer ' + options.userToken;
    }

    // Add CSRF token if needed
    if (options.csrf !== false && this.csrfTokens.has(options.userToken)) {
      requestOptions.headers['CSRF-Token'] = this.csrfTokens.get(options.userToken);
    }

    return new Promise((resolve, reject) => {
      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          
          // Update cookies from response
          this.setCookiesFromResponse(res.headers);

          // Log request
          this.logRequest({
            method: requestOptions.method,
            path: url.pathname + url.search,
            status: res.statusCode,
            duration,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });

          let parsedData;
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            parsedData = data;
          }

          resolve({
            status: res.statusCode,
            data: parsedData,
            body: parsedData?.data, // Unwrapped data
            headers: res.headers,
            duration,
          });
        });
      });

      req.on('error', (error) => {
        this.logRequest({
          method: requestOptions.method,
          path: url.pathname + url.search,
          status: 0,
          duration: Date.now() - startTime,
          success: false,
          error: error.message,
        });
        reject(error);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Log request for debugging
   */
  logRequest(logEntry) {
    this.requestLog.push(logEntry);
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog.shift();
    }
  }

  /**
   * Get request log
   */
  getLog() {
    return this.requestLog;
  }

  /**
   * Clear request log
   */
  clearLog() {
    this.requestLog = [];
  }

  /**
   * Fetch CSRF token from server (sets _csrf cookie and returns token)
   */
  async fetchCSRFToken(userToken) {
    try {
      const response = await this.request('/api/csrf-token', {
        method: 'GET',
        userToken,
        csrf: false,
      });

      const csrfCookie = this.cookies.get('_csrf');
      if (csrfCookie) {
        this.csrfTokens.set(userToken, csrfCookie);
        return csrfCookie;
      }

      if (response.data && response.data.csrfToken) {
        this.csrfTokens.set(userToken, response.data.csrfToken);
        return response.data.csrfToken;
      }
      throw new Error('No CSRF token in response or cookies');
    } catch (error) {
      console.error(`Failed to fetch CSRF token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get CSRF token for a user (fetches if not cached)
   */
  async getCSRFToken(userToken) {
    const cached = this.csrfTokens.get(userToken);
    if (cached) return cached;
    return this.fetchCSRFToken(userToken);
  }

  /**
   * Login and store credentials
   */
  async login(email, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      csrf: false,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Login failed');
    }

    const { token } = response.data;
    await this.fetchCSRFToken(token);
    return token;
  }

  /**
   * Logout
   */
  async logout(userToken) {
    return this.request('/api/auth/logout', {
      method: 'POST',
      userToken,
    });
  }

  /**
   * GET wrapper
   */
  async get(path, userToken, csrf = true) {
    return this.request(path, { method: 'GET', userToken, csrf });
  }

  /**
   * POST wrapper
   */
  async post(path, body, userToken, csrf = true) {
    return this.request(path, { method: 'POST', body, userToken, csrf });
  }

  /**
   * DELETE wrapper
   */
  async delete(path, userToken, csrf = true) {
    return this.request(path, { method: 'DELETE', userToken, csrf });
  }

  /**
   * Clear all stored data (cookies, tokens, logs)
   */
  clear() {
    this.cookies.clear();
    this.csrfTokens.clear();
    this.clearLog();
  }
}

module.exports = APIClient;
