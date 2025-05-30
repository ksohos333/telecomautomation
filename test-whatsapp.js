const twilio = require('twilio');
const config = require('./src/utils/config');
const logger = require('./src/utils/logger');

// Initialize Twilio client
const client = twilio(config.TWILIO_SID, config.TWILIO_AUTH_TOKEN);

async function testWhatsAppIntegration() {
  try {
    // 1. Send a test message to your WhatsApp number
    const message = await client.messages.create({
      body: 'This is a test message from our automation system',
      from: `whatsapp:${config.TWILIO_NUMBER}`,
      to: 'whatsapp:+1234567890' // Replace with your test number
    });
    
    logger.info(`Test message sent with SID: ${message.sid}`);
    
    // 2. Verify webhook is set up correctly in Twilio console
    logger.info('Verify that your webhook URL is configured in Twilio console:');
    logger.info('https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
    
    logger.info('Your webhook should point to: https://your-domain.com/api/twilio/whatsapp');
  } catch (error) {
    logger.error('Error testing WhatsApp integration:', error);
  }
}

testWhatsAppIntegration();