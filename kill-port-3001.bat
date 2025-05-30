@echo off
echo Checking for processes using port 3001...

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') DO (
  echo Found process: %%P using port 3001
  echo Attempting to kill process %%P...
  taskkill /F /PID %%P
  IF %ERRORLEVEL% EQU 0 (
    echo Successfully killed process %%P
  ) ELSE (
    echo Failed to kill process %%P. You may need administrator privileges.
  )
)

echo Done checking for processes using port 3001.
echo.