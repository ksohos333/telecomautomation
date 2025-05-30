const twilio = require('twilio');
const config = require('./src/utils/config');
const logger = require('./src/utils/logger');

// Initialize Twilio client
const client = twilio(config.TWILIO_SID, config.TWILIO_AUTH_TOKEN);
const testNumber = 'whatsapp:+1234567890'; // Replace with your test number

async function testSpecialFeatures() {
  try {
    // Test 1: Message that should trigger screenshots
    await client.messages.create({
      body: 'How do I share my screen in Notion? Can you show me with screenshots?',
      from: `whatsapp:${config.TWILIO_NUMBER}`,
      to: testNumber
    });
    logger.info('Test 1: Screenshot request sent');
    
    // Test 2: Message that should trigger escalation
    await client.messages.create({
      body: 'I need a refund for my Notion subscription immediately. This is urgent!',
      from: `whatsapp:${config.TWILIO_NUMBER}`,
      to: testNumber
    });
    logger.info('Test 2: Escalation request sent');
    
    // Test 3: Conversation continuity test
    await client.messages.create({
      body: 'Hello, I have a question about Notion templates',
      from: `whatsapp:${config.TWILIO_NUMBER}`,
      to: testNumber
    });
    logger.info('Test 3: Conversation starter sent');
    
    // Wait 10 seconds before sending follow-up
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await client.messages.create({
      body: 'Can you help me create a custom template?',
      from: `whatsapp:${config.TWILIO_NUMBER}`,
      to: testNumber
    });
    logger.info('Test 3: Conversation follow-up sent');
    
    logger.info('All test messages sent. Check your WhatsApp and server logs.');
  } catch (error) {
    logger.error('Error testing WhatsApp features:', error);
  }
}

testSpecialFeatures();