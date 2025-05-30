const { handleVoiceCall, textToSpeechConvert } = require('../services/voiceService');
const { generateResponse, classifyIntent } = require('../utils/openai');
const { queryPinecone } = require('../utils/pinecone');
const puppeteerScripts = require('../utils/puppeteerScripts');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Handle an incoming voice call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleIncomingCall(req, res) {
  try {
    const { callId } = req.params;
    const audioBuffer = req.file ? req.file.buffer : null;
    
    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    logger.info(`Processing voice call: ${callId}`);
    
    // Process the voice call
    const result = await handleVoiceCall(audioBuffer, callId);
    
    return res.json({
      success: true,
      callId,
      transcription: result.text,
      responseText: result.responseText,
      audioUrl: `/audio/response-${callId}.mp3`
    });
  } catch (error) {
    logger.error('Error handling incoming call:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

/**
 * Generate voice response for a support ticket
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generateVoiceResponse(req, res) {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    logger.info(`Generating voice response for ticket: ${ticketId}`);
    
    // 1. Classify intent
    const intent = await classifyIntent(content);
    logger.info(`Classified intent as: ${intent}`);
    
    // 2. Get relevant documentation from Pinecone
    const docs = await queryPinecone(content, 3);
    logger.info(`Retrieved ${docs.length} relevant documents from Pinecone`);
    
    // 3. Generate text response using OpenAI with context from Pinecone
    const textResponse = await generateResponse(content, docs);
    
    // 4. Create audio directory if it doesn't exist
    const audioDir = path.join(__dirname, '../../public/audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    // 5. Convert text to speech
    const outputFile = path.join(audioDir, `response-${ticketId}.mp3`);
    await textToSpeechConvert(textResponse, outputFile);
    
    // 6. If it's a visual support issue, run Puppeteer script
    let puppeteerResult = null;
    if (['template_issue', 'vpn_connection', 'screen_share_issue', 'notion_basics'].includes(intent)) {
      puppeteerResult = await puppeteerScripts.runScript(intent, ticketId);
    }
    
    return res.json({
      success: true,
      ticketId,
      intent,
      textResponse,
      audioUrl: `/audio/response-${ticketId}.mp3`,
      puppeteerResult: puppeteerResult
    });
  } catch (error) {
    logger.error('Error generating voice response:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

module.exports = {
  handleIncomingCall,
  generateVoiceResponse
};
