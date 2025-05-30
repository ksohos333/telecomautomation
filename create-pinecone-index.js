const { Pinecone } = require('@pinecone-database/pinecone');
const config = require('./src/utils/config');
const logger = require('./src/utils/logger');

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pineconeApiKey
});

async function createIndex() {
  try {
    logger.info(`Creating Pinecone index "${config.pineconeIndex}"...`);
    
    // Check if the index already exists
    const response = await pinecone.listIndexes();
    const indexList = response.indexes || [];
    const indexExists = indexList.some(index => index.name === config.pineconeIndex);
    
    if (indexExists) {
      logger.info(`Index "${config.pineconeIndex}" already exists.`);
      return;
    }
    
    // Create the index with serverless spec
    await pinecone.createIndex({
      name: config.pineconeIndex,
      dimension: 1536,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: config.pineconeEnv
        }
      }
    });
    
    logger.info(`Index "${config.pineconeIndex}" created successfully.`);
    logger.info('Waiting for index to be ready...');
    
    // Wait for the index to be ready (this might take a minute or two)
    let isReady = false;
    while (!isReady) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const indexDescription = await pinecone.describeIndex(config.pineconeIndex);
      if (indexDescription.status?.ready) {
        isReady = true;
        logger.info('Index is ready!');
      } else {
        logger.info('Index is still initializing...');
      }
    }
  } catch (error) {
    logger.error('Error creating Pinecone index:', error);
  }
}

// Run the script
createIndex();
