const express = require('express');
const compression = require('compression');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { body, validationResult } = require('express-validator');
const csrf = require('csurf');

const app = express();
app.use(compression());

require('dotenv').config();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not set in .env');
  process.exit(1);
}

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured successfully');
} else {
  console.log('⚠️  Cloudinary not configured. File uploads will use local storage.');
}

// Simple in-memory cache for improved performance
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Clear cache helper
const clearCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
};

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  contentTypeOptions: true
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 per hour in production, 20 for testing
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many submissions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', apiLimiter);
}

// CORS configuration - supports localhost, Replit, and custom domains
const getCorsOrigins = () => {
  const env = process.env.NODE_ENV || 'development';
  const corsOrigins = process.env.CORS_ORIGINS || '';

  if (env === 'production') {
    // In production, use configured origins or default to Render/Replit domain patterns
    if (corsOrigins) {
      return corsOrigins.split(',').map(origin => origin.trim());
    }
    // Default: allow Render, Replit, and localhost domains
    return ['https://*.onrender.com', 'https://*.repl.co', 'http://localhost:3000', 'http://127.0.0.1:3000'];
  }

  // Development: allow localhost
  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
};

const corsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with limits
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// CSRF Protection - apply globally but skip safe methods and auth routes
const csrfProtection = csrf({ cookie: true });

// Routes that should skip CSRF validation entirely (no cookie expected)
const csrfExemptRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh'
];

// Skip CSRF in development mode for easier testing
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use((req, res, next) => {
  // Skip CSRF for exempt routes
  if (csrfExemptRoutes.includes(req.path)) {
    return next();
  }
  // Skip CSRF in development mode
  if (isDevelopment) {
    return next();
  }
  // Apply CSRF protection for unsafe methods only (POST, PUT, DELETE, PATCH)
  csrfProtection(req, res, next);
});

// CSRF token endpoint - needs csrf middleware to attach req.csrfToken()
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  const token = req.csrfToken();
  res.json({ csrfToken: token });
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Role-based authorization middleware
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
};

// Input validation helpers
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return true; // optional
  const re = /^\+?[\d\s\-()]{10,}$/;
  return re.test(phone);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/\0/g, '');
};

// Serve only public static assets
const staticOptions = {
  maxAge: '1d',
  etag: true,
  dotfiles: 'ignore',
  index: false
};

app.use('/assets/images', express.static(path.join(__dirname, 'assets', 'images'), staticOptions));
app.use('/assets/docs', express.static(path.join(__dirname, 'assets', 'docs'), staticOptions));
app.use('/css', express.static(path.join(__dirname, 'css'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'js'), staticOptions));

// ============ AUTHENTICATION ROUTES ============

// Register new member with validation and password hashing
app.post('/api/auth/register', authLimiter, [
  body('full_name').custom((value, { req }) => {
    const fullName = typeof value === 'string' ? value.trim() : '';
    const firstName = typeof req.body.first_name === 'string' ? req.body.first_name.trim() : '';
    const lastName = typeof req.body.last_name === 'string' ? req.body.last_name.trim() : '';

    if (fullName || (firstName && lastName)) {
      return true;
    }

    throw new Error('Full name is required');
  }),
  body('email').isEmail().withMessage('Valid email is required'),
  body('college').isLength({ min: 1 }).withMessage('College is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      full_name,
      first_name,
      last_name,
      email,
      phone,
      whatsapp,
      gender,
      date_of_birth,
      college,
      program,
      year_of_study,
      academic_level,
      student_id,
      membership_type,
      skills,
      interests,
      motivation,
      declaration_accepted,
      signature_name,
      declaration_date,
      password
    } = req.body;

    const normalizedFullName = typeof full_name === 'string' ? full_name.trim() : '';
    const derivedName = normalizedFullName || `${first_name || ''} ${last_name || ''}`.trim();
    const nameParts = derivedName.split(/\s+/).filter(Boolean);
    const normalizedFirstName = (typeof first_name === 'string' ? first_name.trim() : '') || nameParts[0] || '';
    const normalizedLastName = (typeof last_name === 'string' ? last_name.trim() : '') || nameParts.slice(1).join(' ') || normalizedFirstName;
    const normalizedInterests = Array.isArray(interests)
      ? interests.join(', ')
      : typeof interests === 'string'
        ? interests
        : '';
    const motivationWordCount = typeof motivation === 'string'
      ? motivation.trim().split(/\s+/).filter(Boolean).length
      : 0;

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    if (whatsapp && !validatePhone(whatsapp)) {
      return res.status(400).json({ success: false, message: 'Invalid WhatsApp number format' });
    }

    if (motivation && motivationWordCount > 100) {
      return res.status(400).json({ success: false, message: 'Motivation statement must be 100 words or fewer' });
    }

    // Sanitize inputs
    const sanitized = {
      first_name: sanitizeInput(normalizedFirstName),
      last_name: sanitizeInput(normalizedLastName),
      email: email.toLowerCase().trim(),
      phone: phone ? sanitizeInput(phone) : null,
      whatsapp: whatsapp ? sanitizeInput(whatsapp) : null,
      gender: gender ? sanitizeInput(gender) : null,
      date_of_birth: date_of_birth ? sanitizeInput(date_of_birth) : null,
      college: sanitizeInput(college),
      program: program ? sanitizeInput(program) : null,
      year_of_study: year_of_study ? sanitizeInput(year_of_study) : null,
      academic_level: academic_level ? sanitizeInput(academic_level) : null,
      student_id: student_id ? sanitizeInput(student_id) : null,
      membership_type: membership_type ? sanitizeInput(membership_type) : 'full',
      skills: skills ? sanitizeInput(skills) : null,
      interests: normalizedInterests ? sanitizeInput(normalizedInterests) : null,
      motivation: motivation ? sanitizeInput(motivation) : null,
      declaration_accepted: declaration_accepted ? 1 : 0,
      signature_name: signature_name ? sanitizeInput(signature_name) : null,
      declaration_date: declaration_date ? sanitizeInput(declaration_date) : null
    };

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(sanitized.email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert new member
    const stmt = db.prepare(`
      INSERT INTO members (
        first_name, last_name, email, password_hash, phone, whatsapp, gender, date_of_birth,
        college, program, year_of_study, academic_level, student_id, membership_type,
        skills, interests, motivation, declaration_accepted, signature_name, declaration_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sanitized.first_name,
      sanitized.last_name,
      sanitized.email,
      password_hash,
      sanitized.phone,
      sanitized.whatsapp,
      sanitized.gender,
      sanitized.date_of_birth,
      sanitized.college,
      sanitized.program,
      sanitized.year_of_study,
      sanitized.academic_level,
      sanitized.student_id,
      sanitized.membership_type,
      sanitized.skills,
      sanitized.interests,
      sanitized.motivation,
      sanitized.declaration_accepted,
      sanitized.signature_name,
      sanitized.declaration_date
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.lastInsertRowid, email: sanitized.email, role: 'member' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to TeTWIT.',
      member_id: result.lastInsertRowid,
      token,
      user: {
        id: result.lastInsertRowid,
        email: sanitized.email,
        first_name: sanitized.first_name,
        last_name: sanitized.last_name,
        role: 'member',
        college: sanitized.college
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// Login with validation
app.post('/api/auth/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const sanitizedEmail = email.toLowerCase().trim();

    // Find member (include lockout fields)
    const member = db.prepare('SELECT * FROM members WHERE email = ?').get(sanitizedEmail);
    if (!member) {
      // Log failed attempt for non-existent email (for security monitoring)
      try {
        db.prepare(`
          INSERT INTO audit_log (action, table_name, record_id, new_values, performed_by, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          'login_failed',
          'members',
          null,
          JSON.stringify({ email: sanitizedEmail, reason: 'user_not_found' }),
          null,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent']
        );
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError.message);
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if account is locked
    if (member.locked_until) {
      const lockedUntil = new Date(member.locked_until);
      if (lockedUntil > new Date()) {
        const remainingMinutes = Math.ceil((lockedUntil - new Date()) / (1000 * 60));
        return res.status(403).json({
          success: false,
          message: `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`,
          locked: true,
          locked_until: member.locked_until
        });
      }
      // Lock expired, reset failed attempts
      db.prepare('UPDATE members SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(member.id);
    }

    // Check password
    const validPassword = await bcrypt.compare(password, member.password_hash);
    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = (member.failed_attempts || 0) + 1;
      db.prepare('UPDATE members SET failed_attempts = ? WHERE id = ?').run(newAttempts, member.id);

      // Check if account should be locked (5 failed attempts)
      if (newAttempts >= 5) {
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        const lockedUntil = new Date(Date.now() + lockDuration).toISOString();
        db.prepare('UPDATE members SET locked_until = ? WHERE id = ?').run(lockedUntil, member.id);

        // Log account lock
        try {
          db.prepare(`
            INSERT INTO audit_log (action, table_name, record_id, old_values, new_values, performed_by, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'account_locked',
            'members',
            member.id,
            JSON.stringify({ failed_attempts: newAttempts - 1 }),
            JSON.stringify({ failed_attempts: newAttempts, locked_until: lockedUntil }),
            null,
            req.ip || req.connection.remoteAddress,
            req.headers['user-agent']
          );
        } catch (auditError) {
          console.error('Failed to create audit log:', auditError.message);
        }

        return res.status(403).json({
          success: false,
          message: 'Account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
          locked: true,
          locked_until: lockedUntil
        });
      }

      // Log failed login attempt
      try {
        db.prepare(`
          INSERT INTO audit_log (action, table_name, record_id, new_values, performed_by, ip_address, user_agent)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          'login_failed',
          'members',
          member.id,
          JSON.stringify({ failed_attempts: newAttempts }),
          null,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent']
        );
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError.message);
      }

      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Successful login - reset failed attempts and update last login
    db.prepare('UPDATE members SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?').run(member.id);

    // Log successful login
    try {
      db.prepare(`
        INSERT INTO audit_log (action, table_name, record_id, performed_by, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'login_success',
        'members',
        member.id,
        member.id,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      );
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError.message);
    }

    // Generate JWT token (exclude sensitive data)
    const token = jwt.sign(
      {
        id: member.id,
        email: member.email,
        name: `${member.first_name} ${member.last_name}`,
        role: member.role || 'member'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: member.id,
        email: member.email,
        first_name: member.first_name,
        last_name: member.last_name,
        role: member.role,
        college: member.college
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Logout (client-side token removal, but provide endpoint for consistency)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const member = db.prepare(`
      SELECT id, first_name, last_name, email, phone, whatsapp, gender, date_of_birth, college,
             program, year_of_study, academic_level, student_id, membership_type, skills, interests,
             motivation, role, status, created_at
      FROM members
      WHERE id = ?
    `).get(req.user.id);

    if (!member) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ FILE UPLOAD & RESOURCES ROUTES ============

// Configure multer for temporary file storage (before uploading to cloud)
const uploadDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, TXT, PPT, PPTX'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Upload file to Cloudinary or local storage and save to database
app.post('/api/resources/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, description, category } = req.body;

    if (!title || !category) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Title and category are required' });
    }

    let fileUrl;
    let publicId;

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'tetwit_resources',
        resource_type: 'auto',
        public_id: `${Date.now()}-${path.parse(req.file.originalname).name}`,
        use_filename: true,
        unique_filename: false,
        overwrite: false
      });

      fileUrl = result.secure_url;
      publicId = result.public_id;
    } else {
      // Fallback to local storage
      const uploadDir = path.join(__dirname, 'assets', 'resources');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const newFileName = `${Date.now()}-${req.file.originalname}`;
      const newPath = path.join(uploadDir, newFileName);
      fs.renameSync(req.file.path, newPath);

      fileUrl = `/assets/resources/${newFileName}`;
      publicId = newFileName;
    }

    // Clean up local file (only if not using local storage fallback)
    if (process.env.CLOUDINARY_CLOUD_NAME || !fileUrl.startsWith('/')) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Save to database
    const stmt = db.prepare(`
      INSERT INTO resources (title, description, category, file_name, file_url, file_size, file_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = db.prepare(`
      INSERT INTO resources (title, description, category, file_name, file_url, file_size, file_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sanitizeInput(title),
      sanitizeInput(description || ''),
      sanitizeInput(category),
      req.file.originalname,
      fileUrl,
      req.file.size,
      req.file.mimetype,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully!',
      data: {
        id: result.lastInsertRowid,
        title: title,
        category: category,
        file_name: req.file.originalname,
        file_url: fileUrl,
        file_size: req.file.size,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.http_code === 413) {
      return res.status(413).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    });
  }
});

// Get all resources (with optional category filter)
app.get('/api/resources', authenticateToken, (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT r.*, m.first_name, m.last_name
      FROM resources r
      LEFT JOIN members m ON r.uploaded_by = m.id
      WHERE r.status = 'active'
    `;

    const params = [];
    if (category) {
      query += ' AND r.category = ?';
      params.push(category);
    }

    query += ' ORDER BY r.created_at DESC';

    const resources = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single resource
app.get('/api/resources/:id', authenticateToken, (req, res) => {
  try {
    const resource = db.prepare(`
      SELECT r.*, m.first_name, m.last_name
      FROM resources r
      LEFT JOIN members m ON r.uploaded_by = m.id
      WHERE r.id = ? AND r.status = 'active'
    `).get(req.params.id);

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete resource (own resource or admin)
app.delete('/api/resources/:id', authenticateToken, (req, res) => {
  try {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const isOwner = resource.uploaded_by === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only delete your own resources' });
    }

    // Soft delete
    db.prepare("UPDATE resources SET status = 'deleted' WHERE id = ?").run(req.params.id);

    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get resource categories
app.get('/api/resources/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM resources
      WHERE status = 'active'
      GROUP BY category
      ORDER BY category
    `).all();

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ PROTECTED MEMBER ROUTES ============

// Get all members (admin only)
app.get('/api/members', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const role = req.query.role || '';

    // Build WHERE clause dynamically
    const conditions = ['deleted_at IS NULL'];
    const params = [];

    if (search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR college LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM members ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params);

    // Get paginated members
    const membersQuery = `
      SELECT id, first_name, last_name, email, phone, college, program, year_of_study, skills, interests, role, status, created_at 
      FROM members 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const members = db.prepare(membersQuery).all(...params, limit, offset);

    res.json({
      success: true,
      data: members,
      pagination: {
        page,
        limit,
        total: totalResult.total,
        totalPages: Math.ceil(totalResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members' });
  }
});

// Get member by ID (own profile or admin)
app.get('/api/members/:id', authenticateToken, (req, res) => {
  try {
    // Validate member ID parameter
    const memberId = parseInt(req.params.id);
    if (isNaN(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid member ID' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwnProfile = req.user.id === memberId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const member = db.prepare('SELECT id, first_name, last_name, email, phone, college, program, year_of_study, skills, interests, role, status, created_at FROM members WHERE id = ?').get(memberId);

    if (member) {
      res.json({ success: true, data: member });
    } else {
      res.status(404).json({ success: false, message: 'Member not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete member (admin only)
app.delete('/api/members/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    // Validate member ID parameter
    const memberId = parseInt(req.params.id);
    if (isNaN(memberId) || memberId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid member ID' });
    }

    // Prevent admin from deleting themselves
    if (memberId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    // Check if member exists and is not already deleted
    const member = db.prepare('SELECT id, first_name, last_name, email, status, deleted_at FROM members WHERE id = ?').get(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.deleted_at) {
      return res.status(400).json({ success: false, message: 'Member has already been deleted' });
    }

    // Capture old values for audit log
    const oldValues = JSON.stringify({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email,
      status: member.status
    });

    // Soft delete: set deleted_at timestamp
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE members SET deleted_at = ?, updated_at = ? WHERE id = ?');
    stmt.run(now, now, memberId);

    // Insert audit log entry
    try {
      db.prepare(`
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values, performed_by, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'soft_delete',
        'members',
        memberId,
        oldValues,
        JSON.stringify({ deleted_at: now, updated_at: now }),
        req.user.id,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      );
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError.message);
      // Continue - audit log failure shouldn't block the operation
    }

    res.json({ 
      success: true, 
      message: `Member "${member.first_name} ${member.last_name}" has been deactivated` 
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete member' });
  }
});

// Get member statistics (admin only)
app.get('/api/members/stats/summary', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL').get();
    const byCollege = db.prepare('SELECT college, COUNT(*) as count FROM members WHERE deleted_at IS NULL GROUP BY college').all();
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM members WHERE deleted_at IS NULL GROUP BY status').all();

    res.json({
      success: true,
      data: {
        total_members: total.count,
        by_college: byCollege,
        by_status: byStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ HEALTH CHECK & MONITORING ============

// Health check endpoint for uptime monitoring
app.get('/api/health', (req, res) => {
  try {
    // Check database connectivity
    const dbResult = db.prepare('SELECT 1 as health_check').get();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbResult ? 'connected' : 'error',
      memory: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external
      }
    };

    const isHealthy = health.database === 'connected';
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Simple ping endpoint for basic monitoring
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ PUBLIC ROUTES ============

// Partnership routes (public submit, admin view)
app.post('/api/partnerships', publicFormLimiter, (req, res) => {
  try {
    const { organization_name, contact_person, email, phone, partnership_type, message } = req.body;

    // Basic validation
    if (!organization_name || !contact_person || !email || !partnership_type) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const stmt = db.prepare(`
      INSERT INTO partnerships (organization_name, contact_person, email, phone, partnership_type, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sanitizeInput(organization_name),
      sanitizeInput(contact_person),
      email.toLowerCase().trim(),
      phone ? sanitizeInput(phone) : null,
      sanitizeInput(partnership_type),
      message ? sanitizeInput(message) : null
    );

    res.status(201).json({
      success: true,
      message: 'Partnership inquiry submitted successfully! We will contact you soon.',
      inquiry_id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Submission failed: ' + error.message });
  }
});

app.get('/api/partnerships', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const partnerships = db.prepare('SELECT * FROM partnerships ORDER BY created_at DESC').all();
    res.json({ success: true, data: partnerships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Event routes
app.post('/api/events', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const { title, description, event_type, location, event_date, registration_deadline, max_participants } = req.body;

    if (!title || !event_type) {
      return res.status(400).json({ success: false, message: 'Title and event type are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO events (title, description, event_type, location, event_date, registration_deadline, max_participants)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(title, description, event_type, location, event_date, registration_deadline, max_participants);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event_id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/events', (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'events:all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const events = db.prepare('SELECT * FROM events ORDER BY event_date ASC').all();

    // Cache the result
    setCachedData(cacheKey, events);

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single event by ID
app.get('/api/events/:id', (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId) || eventId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all messages (admin only)
app.get('/api/messages', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/events/:eventId/register', authenticateToken, (req, res) => {
  try {
    const member_id = req.user.id;
    const event_id = req.params.eventId;

    // Check if event exists
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(event_id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if already registered
    const existing = db.prepare('SELECT id FROM event_registrations WHERE event_id = ? AND member_id = ?').get(event_id, member_id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }

    const stmt = db.prepare('INSERT INTO event_registrations (event_id, member_id) VALUES (?, ?)');
    stmt.run(event_id, member_id);

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Contact routes (public)
app.post('/api/contact', publicFormLimiter, (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    // Validate name length
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Validate message length
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message must be between 10 and 2000 characters' });
    }

    // Validate subject length if provided
    let sanitizedSubject = null;
    if (subject) {
      const trimmedSubject = subject.trim();
      if (trimmedSubject.length > 200) {
        return res.status(400).json({ success: false, message: 'Subject must be less than 200 characters' });
      }
      sanitizedSubject = sanitizeInput(trimmedSubject);
    }

    const stmt = db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      sanitizeInput(trimmedName),
      email.toLowerCase().trim(),
      sanitizedSubject,
      sanitizeInput(trimmedMessage)
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully! We will respond soon.',
      message_id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/contact', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Election routes (admin create, public view, authenticated vote)
app.post('/api/elections', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const { title, position, college, zone, level, start_date, end_date } = req.body;

    if (!title || !position || !level || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const stmt = db.prepare(`
      INSERT INTO elections (title, position, college, zone, level, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(title, position, college, zone, level, start_date, end_date);

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      election_id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/elections', (req, res) => {
  try {
    const elections = db.prepare('SELECT * FROM elections ORDER BY start_date DESC').all();
    res.json({ success: true, data: elections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/elections/:electionId/vote', authenticateToken, (req, res) => {
  try {
    const voter_id = req.user.id;
    const { candidate_id } = req.body;
    const election_id = req.params.electionId;

    if (!candidate_id) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required' });
    }

    // Check if election exists
    const election = db.prepare('SELECT id FROM elections WHERE id = ?').get(election_id);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    // Check if candidate exists
    const candidate = db.prepare('SELECT id FROM candidates WHERE id = ? AND election_id = ?').get(candidate_id, election_id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const stmt = db.prepare('INSERT INTO votes (election_id, candidate_id, voter_id) VALUES (?, ?, ?)');
    stmt.run(election_id, candidate_id, voter_id);

    db.prepare('UPDATE candidates SET votes = votes + 1 WHERE id = ?').run(candidate_id);

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ success: false, message: 'You have already voted in this election' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

// Financial routes (admin only)
app.post('/api/transactions', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const { type, category, amount, description, member_id } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({ success: false, message: 'Type, category, and amount are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (type, category, amount, description, member_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(type, category, amount, description, member_id);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded',
      transaction_id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/transactions/summary', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const income = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'income'").get();
    const expenses = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'").get();
    const byCategory = db.prepare('SELECT category, type, SUM(amount) as total FROM transactions GROUP BY category, type').all();

    res.json({
      success: true,
      data: {
        total_income: income.total || 0,
        total_expenses: expenses.total || 0,
        balance: (income.total || 0) - (expenses.total || 0),
        by_category: byCategory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dashboard stats (admin only for full data)
app.get('/api/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const members = db.prepare('SELECT COUNT(*) as count FROM members').get();
    const partnerships = db.prepare('SELECT COUNT(*) as count FROM partnerships').get();
    const events = db.prepare('SELECT COUNT(*) as count FROM events').get();
    const messages = db.prepare("SELECT COUNT(*) as count FROM contact_messages WHERE status = 'unread'").get();

    res.json({
      success: true,
      data: {
        total_members: members.count,
        total_partnerships: partnerships.count,
        total_events: events.count,
        unread_messages: messages.count
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Serve static files with caching
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '365d', immutable: true }));
app.use('/css', express.static(path.join(__dirname, 'css'), { maxAge: '365d', immutable: true }));
app.use('/js', express.static(path.join(__dirname, 'js'), { maxAge: '365d', immutable: true }));
app.use('/pages', express.static(path.join(__dirname, 'pages'), { maxAge: '0', mustRevalidate: true, extensions: ['html'] }));
app.use(express.static(__dirname, { maxAge: '0', mustRevalidate: true, extensions: ['html'] }));

// Handle SPA routes - serve index.html for any non-API route that doesn't exist as a file
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Check if the requested file exists
  const filePath = path.join(__dirname, req.path);
  
  // If it's a direct file request and doesn't exist, let it fall through to 404
  if (req.path.includes('.')) {
    return next();
  }
  
  // For SPA routes without file extension, serve index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler (already defined above, but in case we need to move it, ensure it's at the end)
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const message = process.env.NODE_ENV === 'production'
    ? 'An error occurred'
    : err.message;

  const statusCode = err.statusCode || 500;

  // For API requests, return JSON
  if (req.path.startsWith('/api/')) {
    const response = {
      success: false,
      message
    };

    if (process.env.NODE_ENV !== 'production' && err.stack) {
      response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
  }

  // For static file requests, return HTML error page
  res.status(statusCode).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${statusCode} - Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        h1 {
          font-size: 4rem;
          margin: 0 0 1rem 0;
        }
        p {
          font-size: 1.2rem;
          margin: 0.5rem 0;
          opacity: 0.9;
        }
        a {
          color: white;
          text-decoration: underline;
          font-weight: 500;
        }
        a:hover {
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${statusCode}</h1>
        <p>${message}</p>
        <p><a href="/">Return to Home</a></p>
      </div>
    </body>
    </html>
  `);
};

// Database Management endpoints (admin only)
app.get('/api/admin/database-stats', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const tables = [
      'members',
      'events', 
      'event_registrations',
      'transactions',
      'partnerships',
      'contact_messages',
      'elections',
      'users'
    ];

    const tableStats = tables.map(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
      // Approximate size (SQLite doesn't provide exact per-table size easily)
      const size = count > 0 ? `${(count * 0.1).toFixed(1)} KB` : '0 KB';
      return { name: table, count, size };
    });

    res.json({
      success: true,
      data: {
        total_members: db.prepare('SELECT COUNT(*) as count FROM members WHERE role != "admin"').get().count,
        total_events: db.prepare('SELECT COUNT(*) as count FROM events').get().count,
        total_transactions: db.prepare('SELECT COUNT(*) as count FROM transactions').get().count,
        total_messages: db.prepare('SELECT COUNT(*) as count FROM contact_messages').get().count,
        tables: tableStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/export-database', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    // Export entire database as SQL
    const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all()
      .map(table => table.sql)
      .join(';\n\n');

    res.json({
      success: true,
      content: sql,
      filename: `tetwit-database-${new Date().toISOString().split('T')[0]}.sql`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/export-members', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const members = db.prepare('SELECT id, first_name, last_name, email, college, role, status, created_at FROM members WHERE role != "admin"').all();
    
    // Convert to CSV
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'College', 'Role', 'Status', 'Joined'];
    const csv = [
      headers.join(','),
      ...members.map(m => [
        m.id,
        `"${m.first_name || ''}"`,
        `"${m.last_name || ''}"`,
        `"${m.email}"`,
        `"${m.college || ''}"`,
        m.role,
        m.status,
        m.created_at
      ].join(','))
    ].join('\n');

    res.json({
      success: true,
      content: csv,
      filename: `members-${new Date().toISOString().split('T')[0]}.csv`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/export-events', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const events = db.prepare('SELECT id, title, event_type, location, event_date, status FROM events').all();
    
    const headers = ['ID', 'Title', 'Type', 'Location', 'Date', 'Status'];
    const csv = [
      headers.join(','),
      ...events.map(e => [
        e.id,
        `"${e.title}"`,
        `"${e.event_type}"`,
        `"${e.location || ''}"`,
        e.event_date,
        e.status
      ].join(','))
    ].join('\n');

    res.json({
      success: true,
      content: csv,
      filename: `events-${new Date().toISOString().split('T')[0]}.csv`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/export-table/:tableName', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const { tableName } = req.params;
    // Whitelist of allowed tables
    const allowedTables = ['members', 'events', 'transactions', 'partnerships', 'contact_messages', 'elections'];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }

    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    if (rows.length === 0) {
      return res.json({ success: true, content: '', filename: `${tableName}.csv` });
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header] === null || row[header] === undefined ? '' : row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    res.json({
      success: true,
      content: csv,
      filename: `${tableName}-${new Date().toISOString().split('T')[0]}.csv`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/clear-test-data', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    // Remove test data but preserve admin account and important records
    // Define criteria for test data
    const deletedCount = {
      members: 0,
      events: 0,
      partnerships: 0,
      messages: 0
    };

    // Delete test members (non-admin accounts with placeholder/test data)
    // Criteria: empty names, test emails, or accounts created very recently without proper data
    const stmt = db.prepare(`
      DELETE FROM members 
      WHERE role != 'admin' 
      AND (
        name IS NULL 
        OR name = '' 
        OR name LIKE 'Test%' 
        OR name LIKE 'test%'
        OR email LIKE '%test%'
        OR email LIKE '%placeholder%'
        OR college IS NULL 
        OR college = ''
      )
    `);
    deletedCount.members = stmt.run().changes;

    // Delete test events (events with generic names or very old/unconfirmed)
    const stmt2 = db.prepare(`
      DELETE FROM events 
      WHERE title IS NULL 
      OR title = '' 
      OR title LIKE 'Test%' 
      OR title LIKE 'test%'
      OR status = 'cancelled'
    `);
    deletedCount.events = stmt2.run().changes;

    // Delete test partnerships
    const stmt3 = db.prepare(`
      DELETE FROM partnerships 
      WHERE organization_name IS NULL 
      OR organization_name = '' 
      OR organization_name LIKE 'Test%'
    `);
    deletedCount.partnerships = stmt3.run().changes;

    // Delete old/empty contact messages
    const stmt4 = db.prepare(`
      DELETE FROM contact_messages 
      WHERE name IS NULL 
      OR name = '' 
      OR email IS NULL 
      OR email = ''
    `);
    deletedCount.messages = stmt4.run().changes;

    const totalDeleted = Object.values(deletedCount).reduce((sum, count) => sum + count, 0);

    res.json({
      success: true,
      message: 'Test data cleared successfully',
      removed_count: totalDeleted,
      details: deletedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 404 handler for unmatched routes
app.use((req, res) => {
  // For API requests, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
  
  // For static file requests, return a simple 404 HTML page
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Page Not Found</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        h1 {
          font-size: 4rem;
          margin: 0 0 1rem 0;
        }
        p {
          font-size: 1.2rem;
          margin: 0.5rem 0;
          opacity: 0.9;
        }
        a {
          color: white;
          text-decoration: underline;
          font-weight: 500;
        }
        a:hover {
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Page Not Found</p>
        <p><a href="/">Return to Home</a></p>
      </div>
    </body>
    </html>
  `);
});

app.use(errorHandler);

// Security configuration
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'production' ? 14 : 10;

// Auto-create admin and client accounts on first run
(async () => {
  try {
    // Ensure exactly one admin account exists
    const adminEmail = 'admin@tetwit.org';
    const adminPassword = 'Admin@TeTWIT2024!';
    
    const existingAdmin = db.prepare('SELECT id FROM members WHERE email = ? AND role = ?').get(adminEmail, 'admin');
    
    if (!existingAdmin) {
      // Check if any admin exists - if yes, don't create another
      const anyAdmin = db.prepare('SELECT id FROM members WHERE role = ? LIMIT 1').get('admin');
      if (anyAdmin) {
        console.log('✅ Admin account already exists (different email)');
      } else {
        const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
        db.prepare(`
          INSERT INTO members (
            first_name, last_name, email, college, 
            password_hash, role, membership_type, 
            declaration_accepted, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run('Admin', 'User', adminEmail, 'TeTWIT HQ', hashedPassword, 'admin', 'full', 1, 'active');
        
        console.log('🎉 Admin account created!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
      }
    } else {
      console.log('✅ Admin already exists');
    }

    // Create client account (Client 1)
    const clientEmail = 'client1@tetwit.org';
    const clientPassword = 'Client1@TeTWIT2024!';
    
    const existingClient = db.prepare('SELECT id FROM members WHERE email = ?').get(clientEmail);
    
    if (!existingClient) {
      const hashedClientPassword = await bcrypt.hash(clientPassword, BCRYPT_ROUNDS);
      db.prepare(`
        INSERT INTO members (
          first_name, last_name, email, college, 
          password_hash, role, membership_type, 
          declaration_accepted, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run('Client', 'One', clientEmail, 'Client Organization', hashedClientPassword, 'member', 'full', 1, 'active');
      
      console.log('🎉 Client account created!');
      console.log('📧 Email:', clientEmail);
      console.log('🔑 Password:', clientPassword);
    } else {
      console.log('✅ Client account already exists');
    }
  } catch (error) {
    console.error('❌ Account setup error:', error.message);
  }
})();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TeTWIT Server running at http://localhost:${PORT}`);
  console.log(`📊 Database: tetwit.db`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log('🔒 Security features enabled: Helmet, Rate Limiting, JWT, Input Validation');
});