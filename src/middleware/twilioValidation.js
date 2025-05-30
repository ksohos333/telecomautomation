const twilio = require('twilio');
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * Middleware to validate Twilio webhook requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateTwilioRequest(req, res, next) {
  // Skip validation in development mode if configured
  if (process.env.NODE_ENV === 'development' && config.SKIP_TWILIO_VALIDATION === 'true') {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  
  if (!twilioSignature) {
    logger.warn('Missing Twilio signature');
    return res.status(403).send('Forbidden: Missing Twilio signature');
  }
  
  // Get the full URL including protocol, hostname, and path
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const url = `${protocol}://${host}${req.originalUrl}`;
  
  // Validate the request
  const isValid = twilio.validateRequest(
    config.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );
  
  if (isValid) {
    return next();
  } else {
    logger.warn('Invalid Twilio signature');
    return res.status(403).send('Forbidden: Invalid Twilio signature');
  }
}

module.exports = {
  validateTwilioRequest
};