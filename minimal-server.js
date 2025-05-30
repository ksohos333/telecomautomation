const express = require('express');
const app = express();
const PORT = 3005;

// Basic route
app.get('/', (req, res) => {
  res.send('Hello World! Server is working.');
});

// Test route
app.get('/test', (req, res) => {
  res.send('Test route is working!');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Try accessing http://localhost:${PORT}/test`);
});

