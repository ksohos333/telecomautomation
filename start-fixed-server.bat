@echo off
echo Starting fixed server...

echo Step 1: Killing any processes using port 3001...
call kill-port-3001.bat

echo Step 2: Installing required dependencies...
npm install express multer --save

echo Step 3: Setting up test environment...
mkdir public\screenshots 2>nul
mkdir public\audio 2>nul
mkdir public\audio\uploads 2>nul
mkdir test-audio 2>nul

echo Creating sample audio file...
echo This is just a placeholder file > public\audio\sample-response.mp3

echo Creating sample screenshots...
echo This is just a placeholder file > public\screenshots\notion-new-page-1.png
echo This is just a placeholder file > public\screenshots\notion-new-page-2.png
echo This is just a placeholder file > public\screenshots\vpn-setup-1.png
echo This is just a placeholder file > public\screenshots\vpn-setup-2.png
echo This is just a placeholder file > public\screenshots\screen-share-1.png
echo This is just a placeholder file > public\screenshots\screen-share-2.png

echo Step 4: Starting the fixed server...
node fixed-server.js
