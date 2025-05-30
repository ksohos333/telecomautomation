const express = require('express');
const { processIncomingEmail } = require('../utils/emailProcessor');
const { sendTicketResponse } = require('../services/emailSender');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Process a test email
router.post('/process-test', asyncHandler(async (req, res) => {
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
  
  // Process the email
  const result = await processIncomingEmail(mockEmail);
  
  // Send an email response if processing was successful
  if (result && result.ticket && result.response) {
    await sendTicketResponse(result.ticket, result.response);
  }
  
  res.json({
    success: true,
    message: 'Email processed successfully',
    result
  });
}));

module.exports = router;
