@echo off
echo Checking GitHub repository connection...
echo.

git remote -v

echo.
if %ERRORLEVEL% EQU 0 (
    echo GitHub remote information found above.
    echo If you see "origin" pointing to your GitHub repository, the connection is successful.
) else (
    echo No GitHub remote found. Please run connect-to-github.bat first.
)

echo.
echo Checking branch information...
echo.

git branch -v

echo.
echo.
pause
