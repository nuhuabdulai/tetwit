@echo off
REM TeTWIT Platform Deployment Setup Script for Windows
REM This script helps prepare your project for deployment on Replit or other platforms

echo ==========================================
echo   TeTWIT Platform - Deployment Setup
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed.
    pause
    exit /b 1
)

npm --version
echo.

REM Check if .env file exists
if not exist ".env" (
    echo .env file not found. Creating a default one...
    
    REM Generate a random JWT secret (basic)
    set /p JWT_SECRET=Enter a secure random string for JWT_SECRET (or press Enter to generate): 
    if "%JWT_SECRET%"=="" (
        set JWT_SECRET=change-this-secret-%RANDOM%-%TIME%
    )
    
    (
echo # Server Configuration
echo PORT=8080
echo NODE_ENV=production
echo JWT_SECRET=%JWT_SECRET%
echo JWT_EXPIRES=7d
echo.
echo # Database
echo DATABASE_PATH=./tetwit.db
echo.
echo # CORS Configuration (comma-separated, no spaces)
echo # For Replit: https://your-repl-name.username.repl.co
echo CORS_ORIGINS=https://*.repl.co,http://localhost:3000
echo.
echo # Security (optional, defaults are secure)
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo SESSION_SECRET=change-this-session-secret-%RANDOM%-%TIME%
echo.
echo # Email Configuration (optional - for sending notifications)
echo # SMTP_HOST=smtp.gmail.com
echo # SMTP_PORT=587
echo # SMTP_USER=your-email@gmail.com
echo # SMTP_PASS=your-app-password
echo # SMTP_FROM=noreply@tetwit.com
echo.
echo # Admin Configuration (optional)
echo # ADMIN_EMAIL=admin@tetwit.com
    ) > .env
    
    echo Created default .env file
    echo IMPORTANT: Review and update the .env file, especially JWT_SECRET!
) else (
    echo .env file exists
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install --production
    echo Dependencies installed
) else (
    echo Dependencies already installed
)

REM Check if database exists
if not exist "tetwit.db" (
    echo.
    echo Database file not found. It will be created on first run.
) else (
    echo Database file exists
)

REM Check required files
echo.
echo Checking required files...
set REQUIRED_FILES=server.js database.js package.json .replit replit.nix
set ALL_PRESENT=true

for %%f in (%REQUIRED_FILES%) do (
    if exist "%%f" (
        echo ✓ %%f
    ) else (
        echo X %%f missing
        set ALL_PRESENT=false
    )
)

if "%ALL_PRESENT%"=="false" (
    echo.
    echo X Some required files are missing. Please check the documentation.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo ✓ Deployment setup complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Review and update .env file with your settings
echo 2. Test locally: npm start
echo 3. Deploy to Replit:
echo    - Upload all files to Replit
echo    - Click 'Run' button
echo.
echo Your app will be available at:
echo   https://your-repl-name.username.repl.co
echo.
echo Dashboard:
echo   https://your-repl-name.username.repl.co/pages/dashboard.html
echo.
echo Health check endpoint:
echo   https://your-repl-name.username.repl.co/api/health
echo.
echo IMPORTANT: Don't forget to:
echo   - Set a strong JWT_SECRET in Replit Secrets
echo   - Configure CORS_ORIGINS for your domain
echo   - Backup your database regularly
echo.
pause
