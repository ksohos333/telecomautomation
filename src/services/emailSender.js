const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Use Gmail as the email service
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address from environment variables
    pass: process.env.EMAIL_APP_PASSWORD // Your Gmail app password from environment variables
  }
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    logger.error('Email service error:', error);
  } else {
    logger.info('Email server is ready to send messages');
  }
});

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 * @returns {Promise<Object>} - Nodemailer info object
 */
async function sendEmail(options) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || ''
    };

    logger.info(`Sending email to ${options.to} with subject: ${options.subject}`);
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);

    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendEmail
};
