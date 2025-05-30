const { getDB, isUsingLocalDb } = require('../utils/mongodb');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex');

// Create a mutex for synchronizing access to the tickets file
const mutex = new Mutex();

// Path to the local tickets file
const ticketsPath = path.join(__dirname, '../../data/tickets.json');

// Initialize the tickets file if it doesn't exist
/**
 * Initialize the tickets file if it doesn't exist
 */
async function initTicketsFile() {
  return mutex.runExclusive(async () => {
    try {
      const dir = path.dirname(ticketsPath);
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      if (!fsSync.existsSync(ticketsPath)) {
        await fs.writeFile(ticketsPath, JSON.stringify([], null, 2));
      }
      return true;
    } catch (error) {
      logger.error('Error initializing tickets file:', error);
      return false;
    }
  });
}

/**
 * Read tickets from file
 * @returns {Promise<Array>} - The tickets array
 */
async function readTickets() {
  return mutex.runExclusive(async () => {
    try {
      if (!fsSync.existsSync(ticketsPath)) {
        await initTicketsFile();
        return [];
      }
      const data = await fs.readFile(ticketsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error reading tickets file:', error);
      return [];
    }
  });
}

/**
 * Write tickets to file
 * @param {Array} tickets - The tickets array to write
 * @returns {Promise<boolean>} - Whether the write was successful
 */
async function writeTickets(tickets) {
  return mutex.runExclusive(async () => {
    try {
      await fs.writeFile(ticketsPath, JSON.stringify(tickets, null, 2));
      return true;
    } catch (error) {
      logger.error('Error writing tickets file:', error);
      return false;
    }
  });
}

/**
 * Common function to handle ticket operations with fallback
 * @param {Function} dbOperation - The database operation to perform
 * @param {Function} fileOperation - The file operation to perform as fallback
 * @returns {Promise<any>} - The result of the operation
 */
async function withFallback(dbOperation, fileOperation) {
  try {
    const db = getDB();
    
    // If db is available, use it
    if (db && typeof db.collection === 'function' && !isUsingLocalDb()) {
      return await dbOperation(db);
    }
    // Otherwise, use local file
    else {
      return await fileOperation();
    }
  } catch (error) {
    logger.error('Database operation failed, using fallback:', error);
    
    // Fallback to local file storage
    try {
      return await fileOperation();
    } catch (fallbackError) {
      logger.error('Fallback operation failed:', fallbackError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Create a new support ticket
 * @param {Object} ticketData - The ticket data
 * @returns {Promise<Object>} - The created ticket
 */
async function createTicket(ticketData) {
  return withFallback(
    // Database operation
    async (db) => {
      const collection = db.collection('tickets');
      
      const ticket = {
        ...ticketData,
        status: ticketData.status || 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(ticket);
      return { ...ticket, _id: result.insertedId };
    },
    // File operation (fallback)
    async () => {
      // Generate a unique ID
      const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const ticket = {
        ...ticketData,
        _id: id,
        status: ticketData.status || 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Read existing tickets
      const tickets = await readTickets();
      
      // Add the new ticket
      tickets.push(ticket);
      
      // Write back to file
      await writeTickets(tickets);
      
      return ticket;
    }
  );
}

/**
 * Get a ticket by ID
 * @param {string} ticketId - The ticket ID
 * @returns {Promise<Object>} - The ticket
 */
async function getTicketById(ticketId) {
  return withFallback(
    // Database operation
    async (db) => {
      const collection = db.collection('tickets');
      return await collection.findOne({ _id: ticketId });
    },
    // File operation (fallback)
    async () => {
      const tickets = await readTickets();
      return tickets.find(ticket => ticket._id === ticketId) || null;
    }
  );
}

/**
 * Update a ticket
 * @param {string} ticketId - The ticket ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} - The updated ticket
 */
async function updateTicket(ticketId, updateData) {
  return withFallback(
    // Database operation
    async (db) => {
      const collection = db.collection('tickets');
      
      const result = await collection.findOneAndUpdate(
        { _id: ticketId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      return result.value;
    },
    // File operation (fallback)
    async () => {
      const tickets = await readTickets();
      const index = tickets.findIndex(ticket => ticket._id === ticketId);
      
      if (index === -1) {
        return null;
      }
      
      tickets[index] = {
        ...tickets[index],
        ...updateData,
        updatedAt: new Date()
      };
      
      await writeTickets(tickets);
      
      return tickets[index];
    }
  );
}

module.exports = {
  createTicket,
  getTicketById,
  updateTicket
};
