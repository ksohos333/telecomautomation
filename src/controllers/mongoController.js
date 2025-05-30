const { createTicket, getTicketById, updateTicket } = require('../models/supportTicket');
const logger = require('../utils/logger');

/**
 * Create a new support ticket
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createSupportTicket(req, res) {
  try {
    const ticketData = req.body;
    
    // Validate required fields
    if (!ticketData.query || !ticketData.email) {
      return res.status(400).json({ error: 'Missing required fields: query and email are required' });
    }
    
    const ticket = await createTicket(ticketData);
    
    res.status(201).json(ticket);
  } catch (error) {
    logger.error('Error in createSupportTicket controller:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
}

/**
 * Get a ticket by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSupportTicket(req, res) {
  try {
    const ticketId = req.params.id;
    
    const ticket = await getTicketById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    logger.error('Error in getSupportTicket controller:', error);
    res.status(500).json({ error: 'Failed to retrieve support ticket' });
  }
}

/**
 * Update a ticket
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateSupportTicket(req, res) {
  try {
    const ticketId = req.params.id;
    const updateData = req.body;
    
    const updatedTicket = await updateTicket(ticketId, updateData);
    
    if (!updatedTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(updatedTicket);
  } catch (error) {
    logger.error('Error in updateSupportTicket controller:', error);
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
}

module.exports = {
  createSupportTicket,
  getSupportTicket,
  updateSupportTicket
};