const twilio = require('twilio');
const config = require('../src/utils/config');
const logger = require('../src/utils/logger');

// Initialize Twilio client
const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

(async () => {
  try {
    const message = await client.messages.create({
      body: 'Hello from your telecom-auto WhatsApp integration!',
      from: `whatsapp:${config.TWILIO_NUMBER}`,
      to: 'whatsapp:+1234567890' // Replace with your test number
    });
    
    logger.info(`Test message sent with SID: ${message.sid}`);
  } catch (error) {
    logger.error('Failed to send WhatsApp message:', error);
  }
})();