@echo off
cd /d "%~dp0"
echo Starting AXIS LAB...
echo Open your browser at: http://localhost:3000
echo To stop the server: press Ctrl+C
echo.
call npm run dev
pause
