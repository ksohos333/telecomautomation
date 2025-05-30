const puppeteerScripts = require('../utils/puppeteerScripts');
const logger = require('../utils/logger');

/**
 * Test script for Puppeteer integration
 * This script runs each of the available Puppeteer scripts to verify they work correctly
 */
async function testPuppeteerScripts() {
  logger.info('Starting Puppeteer scripts test...');
  
  const testCases = [
    {
      intent: 'screen_share_issue',
      ticketId: 'test-ticket-1',
      description: 'Testing screen share issue script'
    },
    {
      intent: 'chat_history_missing',
      ticketId: 'test-ticket-2',
      description: 'Testing chat history issue script'
    },
    {
      intent: 'template_issue',
      ticketId: 'test-ticket-3',
      description: 'Testing Notion template issue script'
    },
    {
      intent: 'vpn_connection',
      ticketId: 'test-ticket-4',
      description: 'Testing VPN connection issue script'
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    logger.info(`Running test: ${testCase.description}`);
    
    try {
      const result = await puppeteerScripts.runScript(testCase.intent, testCase.ticketId);
      
      if (result.success) {
        logger.info(`✅ Test passed: ${testCase.description}`);
        logger.info(`Screenshots: ${result.screenshotUrls?.join(', ')}`);
      } else {
        logger.error(`❌ Test failed: ${testCase.description}`);
        logger.error(`Error: ${result.error}`);
      }
      
      results.push({
        ...testCase,
        success: result.success,
        error: result.error,
        screenshots: result.screenshotUrls || [],
        primaryScreenshot: result.screenshotUrl
      });
    } catch (error) {
      logger.error(`❌ Test error: ${testCase.description}`, error);
      results.push({
        ...testCase,
        success: false,
        error: error.message,
        screenshots: []
      });
    }
  }
  
  // Print summary
  logger.info('Puppeteer scripts test completed');
  logger.info(`Total tests: ${testCases.length}`);
  logger.info(`Passed: ${results.filter(r => r.success).length}`);
  logger.info(`Failed: ${results.filter(r => !r.success).length}`);
  
  return results;
}

// Run the tests if this file is executed directly
if (require.main === module) {
  testPuppeteerScripts()
    .then(() => {
      logger.info('Test script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { testPuppeteerScripts };
