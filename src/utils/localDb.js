const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Simple local database for storing data when MongoDB is not available
 * Uses JSON files to store collections
 */
class LocalDb {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/local-db');
    this.collections = {};
    this.initialized = false;
  }

  /**
   * Initialize the local database
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async init() {
    try {
      // Create the database directory if it doesn't exist
      await fs.mkdir(this.dbPath, { recursive: true });
      logger.info(`Local database directory created at ${this.dbPath}`);
      
      // Load existing collections
      const files = await fs.readdir(this.dbPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const collectionName = file.replace('.json', '');
          await this.loadCollection(collectionName);
        }
      }
      
      this.initialized = true;
      logger.info('Local database initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize local database:', error);
      return false;
    }
  }

  /**
   * Load a collection from disk
   * @param {string} collectionName - The name of the collection to load
   * @returns {Promise<Array>} - The loaded collection data
   */
  async loadCollection(collectionName) {
    try {
      const filePath = path.join(this.dbPath, `${collectionName}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      this.collections[collectionName] = JSON.parse(data);
      logger.info(`Loaded collection ${collectionName} with ${this.collections[collectionName].length} documents`);
      return this.collections[collectionName];
    } catch (error) {
      // If the file doesn't exist, create an empty collection
      if (error.code === 'ENOENT') {
        this.collections[collectionName] = [];
        logger.info(`Created new empty collection ${collectionName}`);
        return this.collections[collectionName];
      }
      
      logger.error(`Failed to load collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Save a collection to disk
   * @param {string} collectionName - The name of the collection to save
   * @returns {Promise<void>}
   */
  async saveCollection(collectionName) {
    try {
      const filePath = path.join(this.dbPath, `${collectionName}.json`);
      await fs.writeFile(filePath, JSON.stringify(this.collections[collectionName], null, 2), 'utf8');
      logger.info(`Saved collection ${collectionName} with ${this.collections[collectionName].length} documents`);
    } catch (error) {
      logger.error(`Failed to save collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents in a collection
   * @param {string} collectionName - The name of the collection
   * @returns {Promise<Array>} - The collection data
   */
  async find(collectionName, query = {}) {
    if (!this.initialized) await this.init();
    
    if (!this.collections[collectionName]) {
      await this.loadCollection(collectionName);
    }
    
    // If no query, return all documents
    if (Object.keys(query).length === 0) {
      return this.collections[collectionName];
    }
    
    // Simple query implementation
    return this.collections[collectionName].filter(doc => {
      for (const key in query) {
        if (doc[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get a document by ID
   * @param {string} collectionName - The name of the collection
   * @param {string} id - The ID of the document
   * @returns {Promise<Object|null>} - The document or null if not found
   */
  async findById(collectionName, id) {
    if (!this.initialized) await this.init();
    
    if (!this.collections[collectionName]) {
      await this.loadCollection(collectionName);
    }
    
    return this.collections[collectionName].find(doc => doc._id === id) || null;
  }

  /**
   * Insert a document into a collection
   * @param {string} collectionName - The name of the collection
   * @param {Object} document - The document to insert
   * @returns {Promise<string>} - The ID of the inserted document
   */
  async insert(collectionName, document) {
    if (!this.initialized) await this.init();
    
    if (!this.collections[collectionName]) {
      await this.loadCollection(collectionName);
    }
    
    // Add ID and timestamps
    const newDoc = {
      ...document,
      _id: document._id || uuidv4(),
      created_at: document.created_at || new Date().toISOString()
    };
    
    this.collections[collectionName].push(newDoc);
    await this.saveCollection(collectionName);
    
    return newDoc._id;
  }

  /**
   * Update a document in a collection
   * @param {string} collectionName - The name of the collection
   * @param {string} id - The ID of the document to update
   * @param {Object} update - The update to apply
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  async update(collectionName, id, update) {
    if (!this.initialized) await this.init();
    
    if (!this.collections[collectionName]) {
      await this.loadCollection(collectionName);
    }
    
    const index = this.collections[collectionName].findIndex(doc => doc._id === id);
    
    if (index === -1) {
      logger.warn(`Document with ID ${id} not found in collection ${collectionName}`);
      return false;
    }
    
    // Update the document
    this.collections[collectionName][index] = {
      ...this.collections[collectionName][index],
      ...update,
      updated_at: new Date().toISOString()
    };
    
    await this.saveCollection(collectionName);
    return true;
  }

  /**
   * Delete a document from a collection
   * @param {string} collectionName - The name of the collection
   * @param {string} id - The ID of the document to delete
   * @returns {Promise<boolean>} - Whether the deletion was successful
   */
  async delete(collectionName, id) {
    if (!this.initialized) await this.init();
    
    if (!this.collections[collectionName]) {
      await this.loadCollection(collectionName);
    }
    
    const initialLength = this.collections[collectionName].length;
    this.collections[collectionName] = this.collections[collectionName].filter(doc => doc._id !== id);
    
    if (this.collections[collectionName].length === initialLength) {
      logger.warn(`Document with ID ${id} not found in collection ${collectionName}`);
      return false;
    }
    
    await this.saveCollection(collectionName);
    return true;
  }
}

module.exports = new LocalDb();
