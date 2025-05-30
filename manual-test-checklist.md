# Manual Test Checklist for Architectural Fixes

This checklist provides manual steps to verify that the architectural issues have been resolved.

## 1. Dependencies Test

- [ ] Run `npm install` to install all dependencies
- [ ] Verify that all dependencies are installed without errors
- [ ] Check that node_modules directory contains all required packages

## 2. Error Handling Test

- [ ] Run the static Express server: `run-static-server.bat`
- [ ] Access a non-existent route (e.g., http://localhost:3007/nonexistent)
- [ ] Verify that you receive a JSON error response instead of HTML
- [ ] Check the logs directory for error logs with proper formatting

## 3. Configuration Test

- [ ] Open `.env` file and modify a configuration value (e.g., change PORT to 3008)
- [ ] Run the server again and verify it uses the new port
- [ ] Restore the original value

## 4. Concurrency Test

- [ ] Run the server: `npm start`
- [ ] Open two browser windows
- [ ] Submit two support tickets simultaneously
- [ ] Verify both tickets are created correctly
- [ ] Check the logs for any race condition errors

## 5. Graceful Shutdown Test

- [ ] Run the server: `npm start`
- [ ] Press Ctrl+C to terminate the server
- [ ] Verify that you see "Shutting down server..." in the console
- [ ] Verify that the database connections are closed properly

## 6. Circular Dependencies Test

- [ ] Run `node src/utils/emailProcessor.js`
- [ ] Verify that it doesn't throw any circular dependency errors
- [ ] Run `node src/models/supportTicket.js`
- [ ] Verify that it doesn't throw any circular dependency errors

## 7. Load Testing

- [ ] Run the server: `npm start`
- [ ] Use a tool like Apache Bench or wrk to send multiple concurrent requests
  ```
  ab -n 100 -c 10 http://localhost:3001/api/email/process-test
  ```
- [ ] Verify that all requests are processed correctly
- [ ] Check the logs for any errors or warnings

## 8. Integration Test

- [ ] Run the automated test script: `run-tests.bat`
- [ ] Verify that all tests pass
- [ ] Check the logs for any errors or warnings

## Additional Verification

- [ ] Code Review: Verify that all files use the logger utility instead of console.log/error
- [ ] Code Review: Verify that all configuration values are centralized in config.js
- [ ] Code Review: Verify that all database operations use proper error handling
- [ ] Code Review: Verify that all routes use the asyncHandler utility