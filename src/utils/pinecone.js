const { Pinecone } = require('@pinecone-database/pinecone');
const { queryLocalVectorDb, initLocalVectorDb } = require('./localVectorDb');
const { generateEmbedding } = require('./openai');
const logger = require('./logger');
const config = require('./config');

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pineconeApiKey
});

// Track Pinecone availability
let pineconeAvailable = false;

/**
 * Initialize Pinecone connection
 * @returns {Promise<boolean>} - Whether Pinecone is available
 */
async function initPinecone() {
  try {
    // Check if the index exists
    const response = await pinecone.listIndexes();
    const indexList = response.indexes || [];
    const indexExists = indexList.some(index => index.name === config.pineconeIndex);

    if (!indexExists) {
      logger.warn(`Index "${config.pineconeIndex}" does not exist. Please create it in the Pinecone dashboard.`);
    }

    logger.info('Pinecone initialized successfully');
    pineconeAvailable = true;

    // Also initialize the local vector database as a backup
    await initLocalVectorDb();

    return true;
  } catch (error) {
    logger.error('Error initializing Pinecone:', error);
    logger.info('Falling back to local vector database');
    pineconeAvailable = false;

    // Initialize the local vector database
    await initLocalVectorDb();

    return false;
  }
}

/**
 * Query Pinecone for similar vectors
 * @param {string|Array} query - The query text or embedding vector
 * @param {number} topK - The number of results to return
 * @returns {Promise<Array>} - The query results
 */
async function queryPinecone(query, topK = 3) {
  // Start timer for metrics
  const startTime = Date.now();

  try {
    // Convert query to embedding if it's a string
    let embedding = query;
    if (typeof query === 'string') {
      embedding = await generateEmbedding(query);
    }
    
    // Try Pinecone first if it's available
    if (pineconeAvailable) {
      try {
        // Get the index
        const index = pinecone.index(config.pineconeIndex);

        // Query the index
        const queryResponse = await index.query({
          vector: embedding,
          topK,
          includeMetadata: true
        });

        // Extract the text from the results
        const docs = queryResponse.matches.map(match => match.metadata.text);

        // Log success metrics
        const duration = Date.now() - startTime;
        logger.info(`Pinecone query successful in ${duration}ms`);

        return docs;
      } catch (error) {
        logger.error('Error querying Pinecone, falling back to local database:', error);
        pineconeAvailable = false;
      }
    }

    // Fall back to local vector database
    logger.info('Using local vector database for query');
    const docs = queryLocalVectorDb(embedding, topK);

    // Log fallback metrics
    const duration = Date.now() - startTime;
    logger.info(`Local vector database query completed in ${duration}ms`);

    return docs;
  } catch (error) {
    logger.error('Error in vector search:', error);
    throw error;
  }
}

module.exports = {
  initPinecone,
  queryPinecone,
  isPineconeAvailable: () => pineconeAvailable
};
