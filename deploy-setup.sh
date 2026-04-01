#!/bin/bash

# TeTWIT Platform Deployment Setup Script
# This script helps prepare your project for deployment on Replit or other platforms

set -e  # Exit on any error

echo "=========================================="
echo "  TeTWIT Platform - Deployment Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current: $(node --version)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm --version) detected${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating a default one...${NC}"

    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-$(date +%s)")

    cat > .env << EOF
# Server Configuration
PORT=8080
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES=7d

# Database
DATABASE_PATH=./tetwit.db

# CORS Configuration (comma-separated, no spaces)
# For Replit: https://your-repl-name.username.repl.co
CORS_ORIGINS=https://*.repl.co,http://localhost:3000

# Security (optional, defaults are secure)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=change-this-session-secret-$(date +%s)

# Email Configuration (optional - for sending notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@tetwit.com

# Admin Configuration (optional)
# ADMIN_EMAIL=admin@tetwit.com
EOF

    echo -e "${GREEN}✓ Created default .env file${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Review and update the .env file, especially JWT_SECRET!${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install --production
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Check if database exists
if [ ! -f "tetwit.db" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Database file not found. It will be created on first run.${NC}"
else
    echo -e "${GREEN}✓ Database file exists${NC}"
fi

# Check required files
echo ""
echo "Checking required files..."
REQUIRED_FILES=("server.js" "database.js" "package.json" ".replit" "replit.nix")
ALL_PRESENT=true

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" = false ]; then
    echo ""
    echo -e "${RED}❌ Some required files are missing. Please check the documentation.${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Deployment setup complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review and update .env file with your settings"
echo "2. Test locally: npm start"
echo "3. Deploy to Replit:"
echo "   - Upload all files to Replit"
echo "   - Click 'Run' button"
echo ""
echo "Your app will be available at:"
echo "  https://your-repl-name.username.repl.co"
echo ""
echo "Dashboard:"
echo "  https://your-repl-name.username.repl.co/pages/dashboard.html"
echo ""
echo "Health check endpoint:"
echo "  https://your-repl-name.username.repl.co/api/health"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "   - Set a strong JWT_SECRET in Replit Secrets"
echo "   - Configure CORS_ORIGINS for your domain"
echo "   - Backup your database regularly"
echo ""
