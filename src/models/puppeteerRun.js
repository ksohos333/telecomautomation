const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const localDb = require('../utils/localDb');
const logger = require('../utils/logger');

/**
 * Schema for storing Puppeteer run results
 * This tracks the execution and results of automated browser scripts
 * 
 * This model supports both MongoDB and local database storage
 */
const puppeteerRunSchema = new mongoose.Schema({
  ticket_id: {
    type: String,
    required: true,
    ref: 'SupportTicket'
  },
  intent: {
    type: String,
    required: true
  },
  script_name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'error'],
    default: 'pending'
  },
  output_urls: [String], // Array of screenshot URLs
  primary_output_url: String, // Main screenshot URL for display
  error_msg: String,
  console_logs: [String], // Console errors captured during execution
  created_at: {
    type: Date,
    default: Date.now
  },
  completed_at: Date
});

// Indexes for efficient querying
puppeteerRunSchema.index({ ticket_id: 1 });
puppeteerRunSchema.index({ intent: 1 });
puppeteerRunSchema.index({ status: 1 });
puppeteerRunSchema.index({ created_at: 1 });

/**
 * Virtual for getting the duration of the run
 */
puppeteerRunSchema.virtual('duration').get(function() {
  if (!this.completed_at) return null;
  return this.completed_at - this.created_at;
});

/**
 * Method to get a summary of the run
 */
puppeteerRunSchema.methods.getSummary = function() {
  return {
    id: this._id,
    intent: this.intent,
    status: this.status,
    screenshots: this.output_urls,
    mainScreenshot: this.primary_output_url,
    error: this.error_msg,
    createdAt: this.created_at,
    completedAt: this.completed_at
  };
};

// Create the Mongoose model
const PuppeteerRunModel = mongoose.model('PuppeteerRun', puppeteerRunSchema);

/**
 * PuppeteerRun class that works with both MongoDB and local database
 */
class PuppeteerRun {
  /**
   * Create a new PuppeteerRun instance
   * @param {Object} data - The run data
   */
  constructor(data) {
    this._id = data._id || uuidv4();
    this.ticket_id = data.ticket_id;
    this.intent = data.intent;
    this.script_name = data.script_name;
    this.status = data.status || 'pending';
    this.output_urls = data.output_urls || [];
    this.primary_output_url = data.primary_output_url || null;
    this.error_msg = data.error_msg || null;
    this.console_logs = data.console_logs || [];
    this.created_at = data.created_at || new Date().toISOString();
    this.completed_at = data.completed_at || null;
  }

  /**
   * Get a summary of the run
   * @returns {Object} - The run summary
   */
  getSummary() {
    return {
      id: this._id,
      intent: this.intent,
      status: this.status,
      screenshots: this.output_urls,
      mainScreenshot: this.primary_output_url,
      error: this.error_msg,
      createdAt: this.created_at,
      completedAt: this.completed_at
    };
  }

  /**
   * Save the run to the database
   * @returns {Promise<string>} - The ID of the saved run
   */
  async save() {
    try {
      // Check if MongoDB is available
      if (global.useLocalDb !== true && mongoose.connection.readyState === 1) {
        // Use MongoDB
        const model = new PuppeteerRunModel({
          _id: this._id,
          ticket_id: this.ticket_id,
          intent: this.intent,
          script_name: this.script_name,
          status: this.status,
          output_urls: this.output_urls,
          primary_output_url: this.primary_output_url,
          error_msg: this.error_msg,
          console_logs: this.console_logs,
          created_at: this.created_at,
          completed_at: this.completed_at
        });
        
        const savedModel = await model.save();
        this._id = savedModel._id.toString();
        return this._id;
      } else {
        // Use local database
        const data = {
          _id: this._id,
          ticket_id: this.ticket_id,
          intent: this.intent,
          script_name: this.script_name,
          status: this.status,
          output_urls: this.output_urls,
          primary_output_url: this.primary_output_url,
          error_msg: this.error_msg,
          console_logs: this.console_logs,
          created_at: this.created_at,
          completed_at: this.completed_at
        };
        
        await localDb.insert('puppeteer_runs', data);
        logger.info(`Created Puppeteer run record: ${this._id}`);
        return this._id;
      }
    } catch (error) {
      logger.error('Error saving Puppeteer run:', error);
      throw error;
    }
  }

  /**
   * Find a run by ID
   * @param {string} id - The run ID
   * @returns {Promise<PuppeteerRun|null>} - The found run or null
   */
  static async findById(id) {
    try {
      // Check if MongoDB is available
      if (global.useLocalDb !== true && mongoose.connection.readyState === 1) {
        // Use MongoDB
        const model = await PuppeteerRunModel.findById(id);
        if (!model) return null;
        
        return new PuppeteerRun(model.toObject());
      } else {
        // Use local database
        const data = await localDb.findById('puppeteer_runs', id);
        if (!data) return null;
        
        return new PuppeteerRun(data);
      }
    } catch (error) {
      logger.error(`Error finding Puppeteer run with ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Find runs by query
   * @param {Object} query - The query object
   * @returns {Promise<PuppeteerRun[]>} - The found runs
   */
  static async find(query = {}) {
    try {
      // Check if MongoDB is available
      if (global.useLocalDb !== true && mongoose.connection.readyState === 1) {
        // Use MongoDB
        const models = await PuppeteerRunModel.find(query).sort({ created_at: -1 });
        return models.map(model => new PuppeteerRun(model.toObject()));
      } else {
        // Use local database
        const data = await localDb.find('puppeteer_runs', query);
        // Sort by created_at in descending order
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return data.map(item => new PuppeteerRun(item));
      }
    } catch (error) {
      logger.error('Error finding Puppeteer runs:', error);
      return [];
    }
  }

  /**
   * Update a run
   * @param {Object} update - The update object
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  async update(update) {
    try {
      // Apply updates to this instance
      Object.assign(this, update);
      
      // Check if MongoDB is available
      if (global.useLocalDb !== true && mongoose.connection.readyState === 1) {
        // Use MongoDB
        await PuppeteerRunModel.findByIdAndUpdate(this._id, update);
      } else {
        // Use local database
        await localDb.update('puppeteer_runs', this._id, update);
        logger.info(`Updated Puppeteer run record: ${this._id}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error updating Puppeteer run with ID ${this._id}:`, error);
      return false;
    }
  }
}

module.exports = PuppeteerRun;
