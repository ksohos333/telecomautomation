const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create a simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

// Initialize Express app
const app = express();
const PORT = 3007;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for all routes

// Add request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  logger.info(`Created public directory at ${publicDir}`);
}

// Create simple-test.html file
const testHtmlPath = path.join(publicDir, 'simple-test.html');
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email API Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, textarea {
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
        }
        textarea {
            height: 150px;
        }
        button {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        #response {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            background-color: #f9f9f9;
            white-space: pre-wrap;
            display: none;
        }
        .success {
            color: green;
        }
        .error {
            color: red;
        }
    </style>
</head>
<body>
    <h1>Email API Test</h1>
    <p>Use this form to test the email processing functionality.</p>
    
    <form id="emailForm">
        <div class="form-group">
            <label for="sender">Sender Email:</label>
            <input type="email" id="sender" value="test@example.com" required>
        </div>
        
        <div class="form-group">
            <label for="subject">Subject:</label>
            <input type="text" id="subject" value="Test Email" required>
        </div>
        
        <div class="form-group">
            <label for="body">Email Body:</label>
            <textarea id="body" required>This is a test email body</textarea>
        </div>
        
        <button type="submit">Send Test Email</button>
    </form>
    
    <div id="response"></div>
    
    <script>
        document.getElementById('emailForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const sender = document.getElementById('sender').value;
            const subject = document.getElementById('subject').value;
            const body = document.getElementById('body').value;
            const responseDiv = document.getElementById('response');
            
            // Validate inputs
            if (!sender || !subject || !body) {
                alert('Please fill in all fields');
                return;
            }
            
            // Prepare request data
            const data = {
                sender,
                subject,
                body
            };
            
            try {
                // Show loading state
                responseDiv.style.display = 'block';
                responseDiv.className = '';
                responseDiv.textContent = 'Processing...';
                
                // Send request
                const response = await fetch('/api/email/process-test', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                // Parse response
                const result = await response.json();
                
                // Display response
                responseDiv.className = response.ok ? 'success' : 'error';
                responseDiv.textContent = JSON.stringify(result, null, 2);
            } catch (error) {
                // Display error
                responseDiv.className = 'error';
                responseDiv.textContent = 'Error: ' + error.message;
            }
        });
    </script>
</body>
</html>
`;

fs.writeFileSync(testHtmlPath, htmlContent);
logger.info(`Created test HTML file at ${testHtmlPath}`);

// After writing the file, add this to verify it exists
setTimeout(() => {
  if (fs.existsSync(testHtmlPath)) {
    const stats = fs.statSync(testHtmlPath);
    logger.info(`File exists: ${testHtmlPath}, size: ${stats.size} bytes`);
    logger.info(`File content (first 100 chars): ${fs.readFileSync(testHtmlPath, 'utf8').substring(0, 100)}...`);
  } else {
    logger.error(`File does not exist: ${testHtmlPath}`);
  }
}, 1000);

// Add this before setting up the static file serving
logger.info(`Public directory path: ${publicDir}`);
logger.info(`Files in public directory: ${fs.existsSync(publicDir) ? fs.readdirSync(publicDir).join(', ') : 'directory does not exist'}`);

// Serve static files from the public directory
app.use(express.static(publicDir));

// Root route to confirm server is running
app.get('/', (req, res) => {
  res.send('📧 Email API Server is up and running');
});

// 404 handler
app.use((req, res, next) => {
  logger.info(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  logger.error('Error:', err.stack);
  
  // Set appropriate content type
  res.setHeader('Content-Type', 'application/json');
  
  // Send error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Process a test email
app.post('/api/email/process-test', async (req, res) => {
  try {
    const { subject, body, sender } = req.body;

    if (!subject || !body || !sender) {
      return res.status(400).json({ error: 'Missing required fields: subject, body, and sender are required' });
    }

    // Create a mock email object
    const mockEmail = {
      subject,
      body,
      sender,
      date: new Date()
    };

    logger.info(`Processing email: ${mockEmail.subject}`);

    // Create a simple ticket
    const ticket = {
      _id: `ticket-${Date.now()}`,
      subject: mockEmail.subject,
      body: mockEmail.body,
      sender: mockEmail.sender,
      created_at: new Date(),
      status: 'new'
    };
    
    // Save to a simple file
    const ticketsDir = path.join(__dirname, 'data');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }
    
    const ticketsFile = path.join(ticketsDir, 'simple-tickets.json');
    let tickets = [];
    
    if (fs.existsSync(ticketsFile)) {
      tickets = JSON.parse(fs.readFileSync(ticketsFile, 'utf8'));
    }
    
    tickets.push(ticket);
    fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));
    
    logger.info(`Created ticket with ID: ${ticket._id}`);
    
    // Return success
    res.json({
      success: true,
      message: 'Email processed successfully',
      ticket
    });
  } catch (error) {
    logger.error('Error processing test email:', error);
    res.status(500).json({ error: 'Failed to process test email' });
  }
});

// Add a simple test route
app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// Also add a specific route for the test page
app.get('/simple-test.html', (req, res) => {
  if (fs.existsSync(testHtmlPath)) {
    res.sendFile(testHtmlPath);
  } else {
    res.status(404).send('Test page not found. The file may not have been created correctly.');
  }
});

// Add a direct test route that serves HTML
app.get('/direct-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Direct Test</title>
    </head>
    <body>
        <h1>Direct Test Page</h1>
        <p>If you can see this, the server is working correctly!</p>
        <p>Try these links:</p>
        <ul>
            <li><a href="/test.html">Test HTML</a></li>
            <li><a href="/simple-test.html">Simple Test HTML</a></li>
            <li><a href="/health">Health Check</a></li>
        </ul>
    </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Simple email server is running on port ${PORT}`);
  logger.info(`Access the server at: http://localhost:${PORT}/`);
  logger.info(`Test page: http://localhost:${PORT}/simple-test.html`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Test endpoint: http://localhost:${PORT}/test`);
});
