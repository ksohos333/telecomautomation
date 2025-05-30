@echo off
echo Starting all customer service automation services...

REM Create a new terminal for each service
start cmd /k "echo Starting main server... && npm start"
timeout /t 3 /nobreak > nul

start cmd /k "echo Starting email server... && .\run-email-server.bat"
timeout /t 2 /nobreak > nul

start cmd /k "echo Starting static server... && node static-express-server.js"
timeout /t 2 /nobreak > nul

REM Open browser tabs for testing
echo Opening test pages in your browser...
start http://localhost:3001/
start http://localhost:3001/email-test.html
start http://localhost:3001/puppeteer-test.html
start http://localhost:3001/support-test.html
start http://localhost:3007/express-test.html

echo.
echo All services started! You can now test:
echo - Email support at http://localhost:3001/email-test.html
echo - Visual support at http://localhost:3001/puppeteer-test.html
echo - Support tickets at http://localhost:3001/support-test.html
echo - Static content at http://localhost:3007/express-test.html
echo.
echo See CUSTOMER-SERVICE-GUIDE.md for detailed instructions.
echo.
echo Press any key to close this window...
pause > nul
