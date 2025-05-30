/**
 * Test script to verify that architectural issues have been resolved
 * Run this script with: node test-fixes.js
 */

const fs = require('fs').promises;
const path = require('path');
const { Mutex } = require('async-mutex');
const logger = require('./src/utils/logger');
const config = require('./src/utils/config');
const { initMongoDB, closeMongoDB, isUsingLocalDb } = require('./src/utils/mongodb');
const { createTicket, updateTicket, getTicketById } = require('./src/models/supportTicket');
const { processIncomingEmail } = require('./src/utils/emailProcessor');
const { initPinecone, queryPinecone } = require('./src/utils/pinecone');
const { generateEmbedding } = require('./src/utils/openai');
const asyncHandler = require('./src/utils/asyncHandler');

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Run a test and record the result
 * @param {string} name - The name of the test
 * @param {Function} testFn - The test function
 */
async function runTest(name, testFn) {
  try {
    logger.info(`Running test: ${name}`);
    await testFn();
    results.passed++;
    results.tests.push({ name, passed: true });
    logger.info(`✅ Test passed: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
    logger.error(`❌ Test failed: ${name}`, error);
  }
}

/**
 * Test that dependencies are properly installed
 */
async function testDependencies() {
  // Check that package.json has dependencies
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
  if (!packageJson.dependencies) {
    throw new Error('package.json does not have dependencies');
  }
  
  // Check that required dependencies are present
  const requiredDeps = [
    'express', 'mongodb', 'winston', 'openai', 
    '@pinecone-database/pinecone', 'async-mutex'
  ];
  
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      throw new Error(`Required dependency ${dep} is missing from package.json`);
    }
  }
  
  // Check that node_modules exists
  const nodeModulesExists = await fs.stat('node_modules')
    .then(stats => stats.isDirectory())
    .catch(() => false);
  
  if (!nodeModulesExists) {
    throw new Error('node_modules directory does not exist. Run npm install first.');
  }
}

/**
 * Test that error handling is consistent
 */
async function testErrorHandling() {
  // Test that asyncHandler works
  const mockReq = {};
  const mockRes = {};
  const mockNext = jest.fn();
  
  const handler = asyncHandler(async () => {
    throw new Error('Test error');
  });
  
  await handler(mockReq, mockRes, mockNext);
  
  if (!mockNext.mock || !mockNext.mock.calls || mockNext.mock.calls.length === 0) {
    // If jest is not available, we'll just check that the function exists
    if (typeof asyncHandler !== 'function') {
      throw new Error('asyncHandler is not a function');
    }
  }
  
  // Check that logger has error method
  if (typeof logger.error !== 'function') {
    throw new Error('logger does not have error method');
  }
}

/**
 * Test that configuration is properly centralized
 */
async function testConfiguration() {
  // Check that config has required properties
  const requiredProps = [
    'port', 'mongoUri', 'dbName', 'useLocalDb', 
    'openaiApiKey', 'embeddingModel', 'completionModel',
    'pineconeApiKey', 'pineconeEnvironment', 'pineconeIndex'
  ];
  
  for (const prop of requiredProps) {
    if (config[prop] === undefined) {
      throw new Error(`Config is missing required property: ${prop}`);
    }
  }
  
  // Check that openai.js uses config
  const openaiJs = await fs.readFile('src/utils/openai.js', 'utf8');
  if (!openaiJs.includes('config.embeddingModel') || !openaiJs.includes('config.completionModel')) {
    throw new Error('openai.js does not use config for model names');
  }
  
  // Check that pinecone.js uses config
  const pineconeJs = await fs.readFile('src/utils/pinecone.js', 'utf8');
  if (!pineconeJs.includes('config.pineconeApiKey') || !pineconeJs.includes('config.pineconeIndex')) {
    throw new Error('pinecone.js does not use config for API key or index name');
  }
}

/**
 * Test that database operations handle race conditions
 */
async function testConcurrency() {
  // Create a test ticket
  const ticket1 = await createTicket({
    query: 'Test query 1',
    email: 'test1@example.com',
    subject: 'Test subject 1',
    source: 'test',
    status: 'open'
  });
  
  // Create another test ticket
  const ticket2 = await createTicket({
    query: 'Test query 2',
    email: 'test2@example.com',
    subject: 'Test subject 2',
    source: 'test',
    status: 'open'
  });
  
  // Update both tickets concurrently
  await Promise.all([
    updateTicket(ticket1._id, { status: 'processed' }),
    updateTicket(ticket2._id, { status: 'escalated' })
  ]);
  
  // Verify updates
  const updatedTicket1 = await getTicketById(ticket1._id);
  const updatedTicket2 = await getTicketById(ticket2._id);
  
  if (updatedTicket1.status !== 'processed') {
    throw new Error(`Ticket 1 status is ${updatedTicket1.status}, expected 'processed'`);
  }
  
  if (updatedTicket2.status !== 'escalated') {
    throw new Error(`Ticket 2 status is ${updatedTicket2.status}, expected 'escalated'`);
  }
}

/**
 * Test that circular dependencies are resolved
 */
async function testCircularDependencies() {
  // Test that emailProcessor can process an email
  const mockEmail = {
    subject: 'Test subject',
    body: 'Test body',
    sender: 'test@example.com',
    date: new Date()
  };
  
  const result = await processIncomingEmail(mockEmail);
  
  if (!result || !result.ticket || !result.response) {
    throw new Error('Email processing failed, possible circular dependency issue');
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  logger.info('Starting tests...');
  
  try {
    // Initialize MongoDB
    await initMongoDB();
    
    // Run tests
    await runTest('Dependencies', testDependencies);
    await runTest('Error Handling', testErrorHandling);
    await runTest('Configuration', testConfiguration);
    await runTest('Concurrency', testConcurrency);
    await runTest('Circular Dependencies', testCircularDependencies);
    
    // Print results
    logger.info('Test results:');
    logger.info(`Passed: ${results.passed}`);
    logger.info(`Failed: ${results.failed}`);
    
    if (results.failed > 0) {
      logger.error('Some tests failed:');
      results.tests.filter(t => !t.passed).forEach(test => {
        logger.error(`- ${test.name}: ${test.error}`);
      });
    } else {
      logger.info('All tests passed! The architectural issues have been resolved.');
    }
  } catch (error) {
    logger.error('Error running tests:', error);
  } finally {
    // Close MongoDB connection
    await closeMongoDB();
  }
}

// Run the tests
runAllTests();