@echo off
echo Starting and verifying server...
echo.

echo Step 1: Checking if port 3001 is already in use...
netstat -ano | findstr :3001
if %ERRORLEVEL% EQU 0 (
    echo Port 3001 is already in use. Please close the application using this port.
    echo You can find the process ID in the last column above and terminate it with:
    echo taskkill /F /PID [PID]
    pause
    exit
)

echo Step 2: Starting the server...
start cmd /k "node src/index.js"

echo Step 3: Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Step 4: Verifying server is running...
curl -s http://localhost:3001 > nul
if %ERRORLEVEL% EQU 0 (
    echo Server is running successfully!
    echo You can now access:
    echo - Main page: http://localhost:3001/
    echo - Support test: http://localhost:3001/support-test.html
    echo - Voice test: http://localhost:3001/voice-test.html
) else (
    echo Server verification failed. Please check the logs.
)

echo.
echo Step 5: Starting ngrok tunnel...
start cmd /k "ngrok http 3001"

echo.
echo Remember to copy the ngrok HTTPS URL and use it in your Twilio settings.
echo.