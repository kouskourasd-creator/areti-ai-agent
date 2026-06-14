@echo off
echo ========================================
echo   Areti AI Agent - Windows Build
echo ========================================
echo.

echo [1/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Installing Electron + Builder...
call npm install electron@33.0.0 electron-builder@25.1.8 --save-dev
if %errorlevel% neq 0 (
    echo ERROR: Electron install failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Building Windows EXE...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo ERROR: EXE build failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Copying server files to release...
copy server.js release\win-unpacked\server.js >nul
copy package.json release\win-unpacked\package.json >nul

echo.
echo ========================================
echo   BUILD COMPLETE!
echo.
echo   EXE Installer:  release\Areti AI Agent Setup.exe
echo   Portable:       release\win-unpacked\Areti AI Agent.exe
echo.
echo   TO RUN WITH AI (Gemini free):
echo   1. Open http://localhost:3000 after starting server
echo   2. Get free API key at https://aistudio.google.com/apikey
echo   3. Click gear icon in Areti and paste your key
echo.
echo   TO START THE SERVER:
echo   npm run server
echo   Then open http://localhost:3000
echo ========================================
pause
