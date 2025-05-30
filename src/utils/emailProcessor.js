const { handleSupportRequest } = require('../controllers/supportController');
const { createTicket, updateTicket } = require('../models/supportTicket');
const logger = require('./logger');

/**
 * Process an email and create a support ticket
 * @param {Object} email - The email object from the email listener
 * @returns {Promise<Object>} - The processed ticket
 */
async function processIncomingEmail(email) {
  try {
    logger.info(`Processing email: ${email.subject}`);
    
    // Create a ticket from the email
    const ticketData = {
      query: email.body,
      email: email.sender,
      subject: email.subject,
      source: 'email',
      status: 'open',
      metadata: {
        receivedAt: email.date
      }
    };
    
    // Save to database
    const savedTicket = await createTicket(ticketData);
    logger.info(`Created ticket in database with ID: ${savedTicket._id}`);
    
    // Process with the support controller
    const req = { 
      body: {
        ticketId: savedTicket._id.toString(),
        content: email.body,
        userEmail: email.sender
      }
    };
    
    let responseData = null;
    const res = {
      status: (code) => {
        return {
          json: (data) => {
            responseData = { ...data, statusCode: code };
          }
        };
      },
      json: (data) => {
        responseData = data;
      }
    };
    
    // Process the ticket using the support controller
    await handleSupportRequest(req, res);
    
    // Update the ticket with the AI response
    if (responseData) {
      await updateTicketWithResponse(savedTicket._id, responseData);
    }
    
    return { ticket: savedTicket, response: responseData };
  } catch (error) {
    logger.error('Error processing incoming email:', error);
    throw error;
  }
}

/**
 * Update a ticket with the AI response
 * @param {string} ticketId - The ticket ID
 * @param {Object} responseData - The response data
 */
async function updateTicketWithResponse(ticketId, responseData) {
  try {
    // Use the updateTicket function which has fallback to local file
    await updateTicket(ticketId, {
      aiResponse: responseData.reply,
      intent: responseData.intent,
      status: responseData.status === 'escalated' ? 'escalated' : 'processed'
    });
    
    logger.info(`Updated ticket ${ticketId} with AI response`);
  } catch (error) {
    logger.error(`Error updating ticket ${ticketId} with response:`, error);
  }
}

module.exports = {
  processIncomingEmail
};
