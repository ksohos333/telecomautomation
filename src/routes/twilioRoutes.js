const express = require('express');
const { 
  handleIncomingPhoneCall, 
  handleMenuSelection,
  processVoiceRecording, 
  handleFollowUp 
} = require('../services/twilioService');
const logger = require('../utils/logger');
const { validateTwilioRequest } = require('../middleware/twilioValidation');

const router = express.Router();

// Apply Twilio webhook validation middleware
router.use(validateTwilioRequest);

/**
 * @route POST /api/twilio/voice
 * @desc Handle incoming Twilio voice calls
 * @access Public
 */
router.post('/voice', async (req, res) => {
  try {
    const twiml = await handleIncomingPhoneCall(req.body);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in Twilio voice webhook:', error);
    res.status(500).send('Error processing call');
  }
});

/**
 * @route POST /api/twilio/menu-selection
 * @desc Handle IVR menu selection
 * @access Public
 */
router.post('/menu-selection', async (req, res) => {
  try {
    const twiml = await handleMenuSelection(req.body);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in menu selection:', error);
    res.status(500).send('Error processing selection');
  }
});

/**
 * @route POST /api/twilio/menu-timeout
 * @desc Handle IVR menu timeout
 * @access Public
 */
router.post('/menu-timeout', async (req, res) => {
  try {
    // Default to technical support if no selection made
    req.body.Digits = '1';
    const twiml = await handleMenuSelection(req.body);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in menu timeout:', error);
    res.status(500).send('Error processing timeout');
  }
});

/**
 * @route POST /api/twilio/process-recording
 * @desc Process voice recording from Twilio
 * @access Public
 */
router.post('/process-recording', async (req, res) => {
  try {
    const twiml = await processVoiceRecording(req.body);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error processing Twilio recording:', error);
    res.status(500).send('Error processing recording');
  }
});

/**
 * @route POST /api/twilio/follow-up
 * @desc Handle follow-up response
 * @access Public
 */
router.post('/follow-up', async (req, res) => {
  try {
    const twiml = await handleFollowUp(req.body);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    logger.error('Error in follow-up:', error);
    res.status(500).send('Error processing follow-up');
  }
});

module.exports = router;