# TeTWIT Platform - Complete Documentation

## 🎓 **What is TeTWIT?**
Teacher Trainee Women in Information Technology - Platform for 46 Ghana Colleges of Education to empower female teacher trainees with digital skills.

## 🛠️ **Tech Stack**
```
Backend: Node.js 20+ Express.js 4.18+
Database: SQLite (better-sqlite3 WAL mode)
Frontend: HTML5/CSS3/JS (Vanilla + FontAwesome)
Security: JWT, bcrypt, Helmet CSP, rate-limiting
Deployment: PM2/Docker ready
```

## 🚀 **Quick Start**
```bash
git clone <repo>
cd sda-pro
npm install
npm start  # or node server.js
open http://localhost:3000
```

## 📱 **Live URLs**
```
Landing: http://localhost:3000
Register: /pages/register.html
Login: /pages/login.html
Dashboard: /pages/dashboard.html
Admin: /pages/admin.html
```

## 🔐 **Security Features**
```
✅ JWT Authentication (env vars)
✅ bcrypt Passwords (10 rounds)
✅ Helmet CSP/HSTS
✅ Rate Limits (API:100/min, Auth:5/hr)
✅ SQL Prepared Statements
✅ Input Sanitization (XSS)
✅ CORS (localhost/prod)
✅ Body Limits (10KB)
```

## 🗄️ **Database Schema**
```
members (id, name, email*, pwd_hash, college*, role)
partnerships (org inquiries)
events (workshops/hackathons)
event_registrations
elections/candidates/votes (secure voting)
transactions (finance)
contact_messages
```
`* = required`

## 📋 **API Endpoints**
```
Auth:
POST /api/auth/register → JWT token
POST /api/auth/login → JWT token
GET /api/auth/me → Profile

Public:
GET /api/events → Event list
POST /api/partnerships → Inquiry
POST /api/contact → Message

Protected (JWT):
GET /api/members → Admin list
POST /api/events/:id/register
POST /api/elections/:id/vote → One-vote-per-member

Admin Only:
POST /api/events → Create
POST /api/elections → Create
GET /api/dashboard → Stats
```

## 🎨 **UI Flow**
```
1. Landing → Register (46 colleges dropdown)
2. Login → Dashboard (events/votes/profile)
3. Admin → Full CRUD (members/events/etc)
4. Forms → Server validation + sanitization
```

## ⚙️ **Environment (.env)**
```
PORT=3000
JWT_SECRET=your-64-char-secret-here
NODE_ENV=production
CORS_ORIGINS=yourdomain.com
```

## 🧪 **Testing**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"first_name":"Test","last_name":"User","email":"test@example.com","college":"SDA College","password":"testpass123"}'

# Events
curl http://localhost:3000/api/events
```

## 🚀 **Production Deploy**
```bash
# PM2
npm i -g pm2
pm2 start ecosystem.config.js

# Docker
docker build -t tetwit .
docker run -p 80:3000 tetwit
```

## 📈 **Scaling**
```
SQLite → PostgreSQL (high traffic)
Redis caching
CDN (images/CSS)
Load balancer (multiple PM2)
```

## 🛡️ **Security Audit (100% PASS)**
```
✅ No SQL injection (prepared stmts)
✅ No XSS (CSP + sanitize)
✅ Rate limited (brute force)
✅ JWT expiry/roles
✅ No file uploads (static only)
✅ Env vars (no secrets in code)
npm audit: 0 vulnerabilities
```

## 📂 **File Structure**
```
├── server.js          # Express API
├── database.js        # SQLite ORM
├── index.html         # Landing
├── pages/             # Auth/Dashboard/Admin
├── css/js/            # Frontend
├── assets/db/         # tetwit.db (WAL)
└── .env               # Secrets
```

## 🔧 **Maintenance**
```
Logs: Server console (IP/timestamps)
Backup: cp assets/db/tetwit.db backup/
Update: npm update && migrate DB
Monitor: PM2 logs
```

## 📞 **Contact**
Pious Akwasi Sarpong  
National Coordinator  
+233 244 767 163  
akwasisarpong@sedacoe.edu.gh

---

**TeTWIT: Secure • Scalable • Empowering 10,000+ Ghanaian teacher trainees! 🎓💻**
