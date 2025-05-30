const { sendEmail } = require('../services/emailSender');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

// Test email address - replace with your test email
const TEST_EMAIL = 'your-test-email@example.com';

async function testEmailSender() {
  try {
    logger.info('Testing email sender...');

    const result = await sendEmail({
      to: TEST_EMAIL,
      subject: 'Test Email from Telecom Automation',
      text: 'This is a test email from the Telecom Automation system.\n\nIf you received this, the email integration is working correctly!',
      html: '<h1>Test Email</h1><p>This is a test email from the Telecom Automation system.</p><p>If you received this, the email integration is working correctly!</p>'
    });

    logger.info('Email sent successfully:', result);
    logger.info('Email sent successfully to', TEST_EMAIL);
  } catch (error) {
    logger.error('Error sending test email:', error);
  }
}

// Run the test
testEmailSender();
