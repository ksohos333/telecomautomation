@echo off
echo Setting up test environment...

echo Creating necessary directories...
mkdir public\screenshots 2>nul
mkdir public\audio 2>nul
mkdir test-audio 2>nul

echo Setting up test audio...
node create-test-audio.js

echo Creating sample audio file...
echo This is just a placeholder file > public\audio\sample-response.mp3

echo Creating sample screenshots...
echo This is just a placeholder file > public\screenshots\notion-new-page-1.png
echo This is just a placeholder file > public\screenshots\notion-new-page-2.png

echo Test environment setup complete!
echo.
echo Next steps:
echo 1. Start the server with: npm start
echo 2. Run the voice test with: .\run-voice-test.bat
echo 3. Open http://localhost:3001/voice-test.html in your browser
echo.