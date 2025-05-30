const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../utils/logger');
const { handleIncomingCall, generateVoiceResponse } = require('../controllers/voiceController');

// Configure multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Ensure test-audio directory exists
const testAudioDir = path.join(__dirname, '../../test-audio');
if (!fs.existsSync(testAudioDir)) {
  fs.mkdirSync(testAudioDir, { recursive: true });
}

// Process text input and generate voice response
router.post('/tickets/:ticketId/response', generateVoiceResponse);

// Process audio input from a call
router.post('/call/:callId', upload.single('audio'), handleIncomingCall);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'Voice service is running' });
});

module.exports = router;
