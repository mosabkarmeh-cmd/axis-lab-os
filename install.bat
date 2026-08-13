@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    AXIS LAB - Installer
echo ============================================
echo.

cd /d "%~dp0"

REM --- 1) Check Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
    echo [X] Node.js is not installed on this computer.
    echo     Download it here: https://nodejs.org  ^(choose the LTS version^)
    echo     Then run this file again.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js found: %%v

REM --- 2) Check / install PostgreSQL ---
where psql >nul 2>nul
if errorlevel 1 (
    echo.
    echo [!] PostgreSQL was not found on this computer.
    where winget >nul 2>nul
    if not errorlevel 1 (
        echo Trying to install it automatically with winget - a small installer
        echo window may pop up, just follow it ^(remember the password you set,
        echo or keep the default one shown below^)...
        winget install --id PostgreSQL.PostgreSQL.16 -e --accept-package-agreements --accept-source-agreements
        echo.
        echo If the installer asked you to set a superuser password, open the
        echo .env file in this folder and put that same password after
        echo SQL_PASSWORD= so it matches. If you kept the suggested password
        echo "axislab_dev_pass", you don't need to change anything.
    ) else (
        echo winget is not available on this computer, so it can't be installed automatically.
        echo.
        echo Please install it yourself, it only takes a couple of minutes:
        echo   1. Go to: https://www.postgresql.org/download/windows/
        echo   2. Download and run the installer.
        echo   3. When it asks for a password, type:  axislab_dev_pass
        echo      ^(or any password you like - just also change SQL_PASSWORD in the .env file to match^)
        echo   4. Keep the default port ^(5432^) and finish the installer.
        echo   5. Run this install.bat file again.
        pause
        exit /b 1
    )
)

REM --- 3) Set up .env if it does not exist ---
if not exist ".env" (
    echo.
    echo No .env file found, creating one with local default values...
    (
        echo GEMINI_API_KEY="MY_GEMINI_API_KEY"
        echo APP_URL="http://localhost:3000"
        echo.
        echo SQL_HOST="localhost"
        echo SQL_USER="postgres"
        echo SQL_PASSWORD="axislab_dev_pass"
        echo SQL_DB_NAME="axislab"
        echo.
        echo SQL_ADMIN_USER="postgres"
        echo SQL_ADMIN_PASSWORD="axislab_dev_pass"
    ) > .env
)

REM --- 4) Install dependencies ---
echo.
echo Installing dependencies... (this can take a few minutes the first time)
call npm install
if errorlevel 1 (
    echo [X] Failed to install dependencies.
    pause
    exit /b 1
)

REM --- 5) Create the axislab database if it doesn't exist yet ---
where psql >nul 2>nul
if not errorlevel 1 (
    echo.
    echo Making sure the "axislab" database exists...
    set PGPASSWORD=axislab_dev_pass
    psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = 'axislab'" | findstr /C:"1" >nul
    if errorlevel 1 (
        createdb -U postgres -h localhost axislab
    )
)

REM --- 6) Create/update database tables ---
echo.
echo Setting up database tables...
echo (Make sure PostgreSQL is running and the connection details in .env are correct)
call npx drizzle-kit push --config=src/db/drizzle.config.ts
if errorlevel 1 (
    echo.
    echo [!] Could not connect to the database.
    echo     Open the .env file and check: SQL_HOST / SQL_USER / SQL_PASSWORD / SQL_DB_NAME
    echo     Make sure PostgreSQL is running ^(check "Services" app for "postgresql"^),
    echo     then run this file again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo    Installation completed successfully!
echo ============================================
echo.
echo To start the program, run start.bat, or manually run:
echo    npm run dev
echo.
echo Then open your browser at: http://localhost:3000
echo.
echo Default login accounts:
echo    admin@axislab.com / admin123
echo    employee@axislab.com / employee123
echo    accountant@axislab.com / accountant123
echo.
pause
