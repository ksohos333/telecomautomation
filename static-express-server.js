const express = require('express');
const path = require('path');
const fs = require('fs');
const logger = require('./src/utils/logger');
const app = express();
const PORT = 3007;

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from Express Static Server!');
});

// Test route
app.get('/test', (req, res) => {
  res.send('Express static server test route is working!');
});

// Test error route - intentionally throws an error to test error handling
app.get('/test-error', (req, res, next) => {
  try {
    // Simulate an error
    throw new Error('This is a test error to verify error handling');
  } catch (error) {
    next(error);
  }
});

// Serve static files from the public directory
app.use(express.static(publicDir));

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  logger.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Graceful shutdown
function shutdown() {
  logger.info('Shutting down static express server...');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Express static server running at http://localhost:${PORT}/`);
  logger.info(`Try these URLs:`);
  logger.info(`- http://localhost:${PORT}/`);
  logger.info(`- http://localhost:${PORT}/test`);
  logger.info(`- http://localhost:${PORT}/express-test.html`);
});