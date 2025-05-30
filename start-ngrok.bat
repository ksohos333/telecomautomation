@echo off
echo Starting ngrok tunnel to expose port 3001...
echo.
echo This will make your local server accessible from the internet
echo so Twilio can send webhook requests to it.
echo.
echo The URL will appear below - copy the https URL and use it in your Twilio settings.
echo.
ngrok http 3001

