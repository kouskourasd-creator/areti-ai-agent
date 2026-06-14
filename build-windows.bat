@echo off
echo ========================================
echo   Areti AI Agent - Windows Build
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Installing Electron + Builder...
call npm install electron@33.0.0 electron-builder@25.1.8 --save-dev
if %errorlevel% neq 0 (
    echo ERROR: Electron install failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Building Windows EXE...
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo ERROR: EXE build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD COMPLETE!
echo   Check the "release" folder for:
echo   Areti AI Agent Setup.exe
echo ========================================
pause
