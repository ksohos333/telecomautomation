const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Readable } = require('stream');
const config = require('../utils/config');
const { processIncomingEmail } = require('../utils/emailProcessor');
const logger = require('../utils/logger');

// Define ticket interface
/**
 * @typedef {Object} Ticket
 * @property {string} subject - Email subject
 * @property {string} body - Email body
 * @property {string} sender - Email sender
 * @property {Date} date - Email date
 */

/**
 * Start the IMAP listener to process incoming emails
 * @returns {Imap} - The IMAP client
 */
function startEmailListener() {
  // Configure IMAP with SMTP credentials
  const imap = new Imap({
    user: process.env.EMAIL_USER || 'konstantinos.sohos@gmail.com',
    password: process.env.EMAIL_APP_PASSWORD || 'vzkl klav hpqf xnbv',
    host: process.env.EMAIL_HOST || 'imap.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '993'),
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });
  
  imap.once('ready', () => {
    logger.info('IMAP connection established');
    
    imap.openBox('INBOX', false, (err) => {
      if (err) {
        logger.error('Error opening inbox:', err);
        return;
      }
      
      logger.info('INBOX opened, listening for new emails');
      
      // Set up event listener for new emails
      imap.on('mail', () => {
        logger.info('New email(s) received');
        
        // Fetch new emails
        const fetch = imap.seq.fetch('1:*', {
          bodies: ['HEADER', 'TEXT'],
          markSeen: false
        });
        
        fetch.on('message', (msg) => {
          /** @type {Partial<Ticket>} */
          const ticket = {};
          
          msg.on('body', (stream, info) => {
            // Convert to Node.js Readable stream
            const readableStream = Readable.from(stream);
            
            simpleParser(readableStream, async (err, parsed) => {
              if (err) {
                logger.error('Error parsing email:', err);
                return;
              }
              
              ticket.subject = parsed.subject || 'No Subject';
              ticket.body = parsed.text || '';
              ticket.sender = parsed.from?.text || '';
              ticket.date = parsed.date || new Date();
              
              // Process the complete ticket
              if (ticket.subject && ticket.body && ticket.sender && ticket.date) {
                try {
                  await processIncomingEmail(ticket);
                  logger.info(`Successfully processed email: ${ticket.subject}`);
                } catch (error) {
                  logger.error('Error processing email ticket:', error);
                }
              }
            });
          });
        });
        
        fetch.once('error', (err) => {
          logger.error('Fetch error:', err);
        });
        
        fetch.once('end', () => {
          logger.info('Done fetching new emails');
        });
      });
    });
  });
  
  imap.once('error', (err) => {
    logger.error('IMAP connection error:', err);
  });
  
  imap.once('end', () => {
    logger.info('IMAP connection ended');
  });
  
  // Connect to the IMAP server
  imap.connect();
  
  return imap;
}

module.exports = {
  startEmailListener
};

