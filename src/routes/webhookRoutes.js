const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const { validateTwilioRequest } = require('../middleware/twilioValidation');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

// Health check endpoint for WhatsApp webhook
router.get('/whatsapp/health', (req, res) => {
  res.status(200).send('WhatsApp webhook is healthy');
});

// WhatsApp webhook endpoint
router.post('/whatsapp', validateTwilioRequest, async (req, res) => {
  try {
    const twiml = new MessagingResponse();
    
    // Process the incoming message
    await whatsappService.processWhatsAppMessage(req.body);
    
    // We don't need to respond with a message here since processWhatsAppMessage
    // will handle sending the response asynchronously
    res.type('text/xml').send(twiml.toString());
    
    logger.info('WhatsApp webhook processed successfully');
  } catch (error) {
    logger.error(`Error processing WhatsApp webhook: ${error.message}`);
    
    // Send a fallback response
    const twiml = new MessagingResponse();
    twiml.message('Sorry, something went wrong. Please try again later.');
    res.type('text/xml').send(twiml.toString());
  }
});

module.exports = router;
