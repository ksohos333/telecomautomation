const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const localDb = require('./localDb');

/**
 * Initialize the local database structure
 * This creates the necessary directories and empty collection files
 */
async function initLocalDb() {
  try {
    logger.info('Initializing local database structure...');
    
    // Initialize the local database
    await localDb.init();
    
    // Create the screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, '../../public/screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true });
    logger.info(`Screenshots directory created at ${screenshotsDir}`);
    
    // Create empty collections for Puppeteer runs if they don't exist
    await localDb.find('puppeteer_runs');
    
    logger.info('Local database structure initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize local database structure:', error);
    return false;
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initLocalDb()
    .then(() => {
      logger.info('Initialization script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Initialization script error:', error);
      process.exit(1);
    });
}

module.exports = { initLocalDb };
