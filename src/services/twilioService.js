const twilio = require('twilio');
const { Readable } = require('stream');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { speechToText } = require('./voiceService');
const { generateResponse } = require('../utils/openai');
const { queryPinecone } = require('../utils/pinecone');

// Initialize Twilio client
const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

// Initialize Redis for session management
const redis = new Redis(config.REDIS_URL);

/**
 * Handle incoming phone calls with IVR menu
 * @param {Object} call - Twilio call object
 * @returns {Object} - TwiML response
 */
async function handleIncomingPhoneCall(call) {
  try {
    const callSid = call.CallSid;
    const from = call.From;
    
    logger.info(`Incoming call from: ${from}, SID: ${callSid}`);
    
    // Create session in Redis
    await redis.hmset(`call:${callSid}`, {
      from,
      startTime: Date.now(),
      state: 'ivr_menu',
      transcripts: JSON.stringify([])
    });
    
    // Generate TwiML for IVR menu
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.gather({
      numDigits: 1,
      action: '/api/twilio/menu-selection',
      method: 'POST',
      timeout: 10
    }).say('Welcome to our support system. Press 1 for technical support, press 2 for account issues, or press 3 for other inquiries.');
    
    // If no input, retry once then go to default flow
    twiml.redirect('/api/twilio/menu-timeout');
    
    return twiml;
  } catch (error) {
    logger.error('Error handling incoming phone call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We are experiencing technical difficulties. Please try again later.');
    twiml.hangup();
    return twiml;
  }
}

/**
 * Handle IVR menu selection
 * @param {Object} selection - Menu selection data
 * @returns {Object} - TwiML response
 */
async function handleMenuSelection(selection) {
  try {
    const callSid = selection.CallSid;
    const digits = selection.Digits;
    
    // Update session state
    await redis.hset(`call:${callSid}`, 'state', 'recording');
    await redis.hset(`call:${callSid}`, 'selection', digits);
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    switch (digits) {
      case '1':
        twiml.say('You selected technical support. Please describe your issue after the beep.');
        break;
      case '2':
        twiml.say('You selected account support. Please describe your issue after the beep.');
        break;
      case '3':
        twiml.say('You selected general inquiries. Please describe your question after the beep.');
        break;
      default:
        twiml.say('Invalid selection. Please describe your issue after the beep.');
    }
    
    // Record user's issue
    twiml.record({
      action: '/api/twilio/process-recording',
      maxLength: 60,
      timeout: 5,
      transcribe: false // We'll use our own Whisper transcription
    });
    
    return twiml;
  } catch (error) {
    logger.error('Error handling menu selection:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We are experiencing technical difficulties. Please try again later.');
    twiml.hangup();
    return twiml;
  }
}

/**
 * Process recorded voice from Twilio with Whisper API
 * @param {Object} recording - Recording data from Twilio
 * @returns {Promise<Object>} - TwiML response
 */
async function processVoiceRecording(recording) {
  try {
    const callSid = recording.CallSid;
    const recordingUrl = recording.RecordingUrl;
    
    logger.info(`Processing recording for call ${callSid}: ${recordingUrl}`);
    
    // Update session state
    await redis.hset(`call:${callSid}`, 'state', 'processing');
    await redis.hset(`call:${callSid}`, 'recordingUrl', recordingUrl);
    
    // Get call category from session
    const selection = await redis.hget(`call:${callSid}`, 'selection') || '1';
    
    // 1. Download and transcribe the recording using Whisper
    const transcription = await speechToText(recordingUrl);
    logger.info(`Transcription: ${transcription}`);
    
    // 2. Update transcripts in session
    const transcriptsJson = await redis.hget(`call:${callSid}`, 'transcripts') || '[]';
    const transcripts = JSON.parse(transcriptsJson);
    transcripts.push({
      timestamp: Date.now(),
      text: transcription,
      role: 'user'
    });
    await redis.hset(`call:${callSid}`, 'transcripts', JSON.stringify(transcripts));
    
    // 3. Get relevant documentation based on transcription
    const docs = await queryPinecone(transcription);
    
    // 4. Generate AI response
    const categoryContext = {
      '1': 'technical support',
      '2': 'account issues',
      '3': 'general inquiries'
    }[selection];
    
    const systemPrompt = `You are a helpful customer support agent for ${categoryContext}. 
    Keep your responses concise and clear for voice communication. 
    If you need more information, ask a specific question.
    If you cannot help, offer to connect to a human agent.`;
    
    const response = await generateResponse(transcription, docs, systemPrompt);
    
    // 5. Update transcripts with AI response
    transcripts.push({
      timestamp: Date.now(),
      text: response,
      role: 'assistant'
    });
    await redis.hset(`call:${callSid}`, 'transcripts', JSON.stringify(transcripts));
    
    // 6. Generate TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, response);
    
    // 7. Ask if the user needs more help
    twiml.gather({
      numDigits: 1,
      action: '/api/twilio/follow-up',
      method: 'POST',
      timeout: 10
    }).say('Press 1 if you need more help, or press 2 if your issue is resolved.');
    
    return twiml;
  } catch (error) {
    logger.error('Error processing voice recording:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We encountered an issue processing your request. Please try again later.');
    twiml.hangup();
    return twiml;
  }
}

/**
 * Handle follow-up response
 * @param {Object} selection - Follow-up selection data
 * @returns {Object} - TwiML response
 */
async function handleFollowUp(selection) {
  try {
    const callSid = selection.CallSid;
    const digits = selection.Digits;
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (digits === '1') {
      // User needs more help
      await redis.hset(`call:${callSid}`, 'state', 'recording');
      
      twiml.say('Please provide more details about your issue after the beep.');
      twiml.record({
        action: '/api/twilio/process-recording',
        maxLength: 60,
        timeout: 5,
        transcribe: false
      });
    } else {
      // Issue resolved
      await redis.hset(`call:${callSid}`, 'state', 'completed');
      
      twiml.say('Thank you for contacting our support. Have a great day!');
      twiml.hangup();
      
      // Log call metrics
      const startTime = await redis.hget(`call:${callSid}`, 'startTime');
      const duration = Date.now() - parseInt(startTime || 0);
      logger.info(`Call ${callSid} completed. Duration: ${duration}ms`);
    }
    
    return twiml;
  } catch (error) {
    logger.error('Error handling follow-up:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We are experiencing technical difficulties. Please try again later.');
    twiml.hangup();
    return twiml;
  }
}

module.exports = {
  handleIncomingPhoneCall,
  handleMenuSelection,
  processVoiceRecording,
  handleFollowUp
};