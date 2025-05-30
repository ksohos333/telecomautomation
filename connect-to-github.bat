@echo off
echo This script will connect your local repository to GitHub
echo.

set /p username=Enter your GitHub username: 
set /p repo=Enter your repository name (default: telecom-auto): 

if "%repo%"=="" set repo=telecom-auto

echo.
echo Connecting to https://github.com/%username%/%repo%.git
echo.

git remote add origin https://github.com/%username%/%repo%.git
git branch -M main
git push -u origin main

echo.
echo Repository connected and pushed to GitHub!
echo.
echo You can now view your repository at: https://github.com/%username%/%repo%
echo.
pause
