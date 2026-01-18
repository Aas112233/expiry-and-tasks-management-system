@echo off
echo Setting up Flutter environment...
set PATH=%PATH%;C:\src\flutter\bin

echo.
echo Running flutter create...
call flutter create .
if %errorlevel% neq 0 (
    echo Error during flutter create.
    pause
    exit /b %errorlevel%
)

echo.
echo Building APK...
call flutter build apk --release
if %errorlevel% neq 0 (
    echo Error during flutter build.
    pause
    exit /b %errorlevel%
)

echo.
echo Build successful! APK is located at:
echo expiry_mobile\build\app\outputs\flutter-apk\app-release.apk
pause
