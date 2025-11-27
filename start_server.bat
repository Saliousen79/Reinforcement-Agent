@echo off
echo.
echo ========================================
echo  Capture the Flag - Server Start
echo ========================================
echo.
echo Starte HTTP Server im Projekt-Root...
echo.
echo Oeffne deinen Browser und gehe zu:
echo.
echo   http://localhost:8000/
echo   http://localhost:8000/dashboard/
echo   http://localhost:8000/visualization/
echo.
echo Druecke STRG+C um den Server zu stoppen.
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8000
