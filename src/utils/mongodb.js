const { MongoClient } = require('mongodb');
const logger = require('./logger');
const localDb = require('./localDb');
const { initLocalDb } = require('./initLocalDb');
const config = require('./config');

// MongoDB client
let client = null;
let db = null;
let isUsingLocalDb = false;

/**
 * Initialize MongoDB connection
 * @returns {Promise<boolean>} - Whether MongoDB is available
 */
async function initMongoDB() {
  try {
    // Check if MongoDB URI is provided
    if (!config.mongoUri) {
      logger.warn('MongoDB URI not provided, using local database');
      await initLocalDb();
      isUsingLocalDb = true;
      return true;
    }

    // Create a new MongoClient
    client = new MongoClient(config.mongoUri);
    
    // Connect to the MongoDB server
    await client.connect();
    
    // Get the database
    db = client.db(config.dbName);
    
    logger.info('MongoDB initialized successfully');
    return true;
  } catch (error) {
    logger.warn('Error initializing MongoDB, falling back to local database:', error);
    
    // Initialize local database as fallback
    await initLocalDb();
    isUsingLocalDb = true;
    
    return true;
  }
}

/**
 * Get the MongoDB database instance
 * @returns {object} - The MongoDB database instance or local database
 */
function getDB() {
  if (isUsingLocalDb) {
    return localDb;
  }
  return db;
}

/**
 * Close the MongoDB connection
 */
async function closeMongoDB() {
  if (client && !isUsingLocalDb) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
}

module.exports = {
  initMongoDB,
  getDB,
  closeMongoDB,
  isUsingLocalDb: () => isUsingLocalDb
};
