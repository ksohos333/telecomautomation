const express = require('express');
const app = express();
const PORT = 3007;

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// Test route
app.get('/test', (req, res) => {
  res.send('Express test route is working!');
});

// HTML test route
app.get('/html', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Express Test</title>
    </head>
    <body>
      <h1>Express HTML Test</h1>
      <p>This is a test HTML page served by Express.</p>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/test">Test Route</a></li>
      </ul>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express server running at http://localhost:${PORT}/`);
  console.log(`Try these URLs:`);
  console.log(`- http://localhost:${PORT}/`);
  console.log(`- http://localhost:${PORT}/test`);
  console.log(`- http://localhost:${PORT}/html`);
});