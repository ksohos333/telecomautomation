const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const logger = console;

// Initialize Express app
const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for all routes

// Add request logging
app.use((req, res, next) => {
  logger.log(`${req.method} ${req.url}`);
  next();
});

// Add static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Simple email processing route
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
    
    // Log the email
    logger.log('Processing email:', mockEmail);
    
    // Create a simple ticket
    const ticket = {
      _id: `simple-${Date.now()}`,
      query: body,
      email: sender,
      subject,
      source: 'email',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
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
    
    logger.log(`Created ticket with ID: ${ticket._id}`);
    
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

// Start the server
app.listen(PORT, () => {
  logger.log(`Simple server is running on port ${PORT}`);
});
