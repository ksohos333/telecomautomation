const express = require('express');
const app = express();
const PORT = 3001;

// Basic route
app.get('/', (req, res) => {
  res.send('Test server is running on port 3001');
});

// Test route
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Test endpoint is working' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
  console.log(`Try accessing http://localhost:${PORT}/test`);
});