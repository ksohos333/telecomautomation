// Simple script to debug server startup issues
const express = require('express');
const app = express();
const PORT = 3001;

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Basic route
app.get('/', (req, res) => {
  res.send('Debug server is running');
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log('Press Ctrl+C to stop');
})
.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try stopping other servers or using a different port.`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});