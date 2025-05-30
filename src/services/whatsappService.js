const twilio = require('twilio');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { generateResponse, classifyIntent } = require('../utils/openai');
const { queryPinecone } = require('../utils/pinecone');
const puppeteerScripts = require('../utils/puppeteerScripts');
const { Mutex } = require('async-mutex');

// Initialize Twilio client for WhatsApp
const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

// Initialize Redis for session management
const redis = new Redis(config.REDIS_URL);

// Initialize mutex for rate limiting
const sendMutex = new Mutex();

/**
 * Process incoming WhatsApp message
 * @param {Object} message - Message data from Twilio
 * @returns {Promise<Object>} - Processing result
 */
async function processWhatsAppMessage(message) {
  try {
    const from = message.From;
    const body = message.Body || '';
    const mediaUrl = message.MediaUrl0;
    const userId = from.replace('whatsapp:', '');
    const sessionId = `whatsapp:${userId}`;
    
    logger.info(`Processing WhatsApp message from ${userId}: ${body.substring(0, 50)}...`);
    
    // Get or create session
    let session = await getOrCreateSession(sessionId);
    
    // Update conversation history
    session.messages.push({
      role: 'user',
      content: body,
      timestamp: Date.now(),
      mediaUrl: mediaUrl || null
    });
    
    // Save updated session
    await saveSession(sessionId, session);
    
    // Process message
    let intent, docs, textResponse, screenshots = [];
    
    // 1. Classify intent if this is a new conversation
    if (session.messages.length <= 2) {
      intent = await classifyIntent(body);
      session.intent = intent;
      await saveSession(sessionId, session);
      logger.info(`Classified intent as: ${intent}`);
    } else {
      intent = session.intent;
      logger.info(`Using existing intent: ${intent}`);
    }
    
    // 2. Get relevant documentation
    docs = await queryPinecone(body);
    
    // 3. Generate text response
    const conversationHistory = session.messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({ role: msg.role, content: msg.content }));
    
    // Add system message at the beginning
    conversationHistory.unshift({
      role: 'system',
      content: `You are a helpful customer support agent for Notion. 
      The user's intent is: ${intent}.
      Keep responses concise and clear.
      If you need screenshots or visual guides, include [NEED_SCREENSHOTS] in your response.
      If you cannot help, include [ESCALATE] in your response.`
    });
    
    // Generate response with conversation history
    textResponse = await generateResponse(body, docs, conversationHistory);
    
    // 4. Check if we need to run Puppeteer
    if (textResponse.includes('[NEED_SCREENSHOTS]')) {
      // Remove the tag from the response
      textResponse = textResponse.replace('[NEED_SCREENSHOTS]', '');
      
      // Run Puppeteer script based on intent
      if (['template_issue', 'vpn_connection', 'screen_share_issue', 'notion_basics'].includes(intent)) {
        const puppeteerResult = await puppeteerScripts.runScript(intent, sessionId);
        if (puppeteerResult && puppeteerResult.screenshots) {
          screenshots = puppeteerResult.screenshots;
        }
      }
    }
    
    // 5. Check for escalation
    if (textResponse.includes('[ESCALATE]')) {
      logger.info('Escalating to human support...');
      await escalateToHumanSupport(from, body, session.messages);
      logger.info('Escalation complete');
      
      // Remove [ESCALATE] from the response
      textResponse = textResponse.replace('[ESCALATE]', '').trim();
    }
    
    // 6. Update session with assistant response
    session.messages.push({
      role: 'assistant',
      content: textResponse,
      timestamp: Date.now(),
      screenshots: screenshots
    });
    
    await saveSession(sessionId, session);
    
    // 7. Send response back to user
    await sendWhatsAppResponse(from, textResponse, screenshots);
    
    return {
      success: true,
      from,
      intent,
      textResponse,
      screenshots
    };
  } catch (error) {
    logger.error('Error processing WhatsApp message:', error);
    
    // Try to send error message to user
    try {
      await sendWhatsAppResponse(message.From, 'Sorry, I encountered an error processing your request. Please try again later.');
    } catch (sendError) {
      logger.error('Error sending error message:', sendError);
    }
    
    throw error;
  }
}

/**
 * Send WhatsApp response
 * @param {string} to - Recipient phone number with whatsapp: prefix
 * @param {string} body - Message body
 * @param {Array<string>} screenshots - Array of screenshot URLs
 * @returns {Promise<Object>} - Twilio message object
 */
async function sendWhatsAppResponse(to, body, screenshots = []) {
  // Use mutex to prevent rate limiting
  return await sendMutex.runExclusive(async () => {
    try {
      logger.info(`Sending WhatsApp response to ${to}`);
      
      // If we have screenshots, send them first
      if (screenshots && screenshots.length > 0) {
        for (const screenshot of screenshots) {
          await client.messages.create({
            from: `whatsapp:${config.TWILIO_PHONE_NUMBER}`,
            to: to,
            mediaUrl: [screenshot.startsWith('http') ? screenshot : `${config.BASE_URL}${screenshot}`]
          });
          
          // Wait a bit to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Send text response
      const message = await client.messages.create({
        from: `whatsapp:${config.TWILIO_PHONE_NUMBER}`,
        to: to,
        body: body
      });
      
      logger.info(`WhatsApp message sent, SID: ${message.sid}`);
      return message;
    } catch (error) {
      logger.error('Error sending WhatsApp response:', error);
      throw error;
    }
  });
}

/**
 * Escalate a conversation to human support
 * @param {string} from - The user's WhatsApp number
 * @param {string} body - The message body
 * @param {Array<Object>} messages - The conversation history
 * @returns {Promise<void>}
 */
async function escalateToHumanSupport(from, body, messages) {
  try {
    logger.info(`Escalating conversation with ${from} to human support`);
    
    // In a real implementation, this would integrate with your ticketing system
    // For now, we'll just log the escalation
    
    // Notify the user
    await sendWhatsAppResponse(
      from, 
      "I'm transferring you to a human agent who will assist you shortly. Thank you for your patience."
    );
    
    // TODO: Implement integration with your ticketing/CRM system
    // Example: Create a ticket in Zendesk, Salesforce, etc.
    
    logger.info(`Successfully escalated conversation with ${from} to human support`);
  } catch (error) {
    logger.error(`Error escalating to human support: ${error.message}`);
    throw error;
  }
}

/**
 * Get or create a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session object
 */
async function getOrCreateSession(sessionId) {
  try {
    const sessionData = await redis.get(sessionId);
    
    if (sessionData) {
      return JSON.parse(sessionData);
    } else {
      // Create new session
      const newSession = {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        intent: null,
        messages: []
      };
      
      await saveSession(sessionId, newSession);
      return newSession;
    }
  } catch (error) {
    logger.error('Error getting/creating session:', error);
    
    // Fallback to in-memory session if Redis fails
    return {
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      intent: null,
      messages: []
    };
  }
}

/**
 * Save session to Redis
 * @param {string} sessionId - Session ID
 * @param {Object} session - Session object
 * @returns {Promise<void>}
 */
async function saveSession(sessionId, session) {
  try {
    session.updatedAt = Date.now();
    await redis.set(sessionId, JSON.stringify(session), 'EX', 86400); // Expire after 24 hours
  } catch (error) {
    logger.error('Error saving session:', error);
    // Continue without throwing - we can still function without persistent sessions
  }
}

module.exports = {
  processWhatsAppMessage,
  sendWhatsAppResponse,
  getOrCreateSession,
  saveSession
};
