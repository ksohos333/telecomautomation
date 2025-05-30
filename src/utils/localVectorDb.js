const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { generateEmbedding } = require('./openai');
const logger = require('./logger');
const { Mutex } = require('async-mutex');
const config = require('./config');

// Create a mutex for synchronizing access to the vector database
const mutex = new Mutex();

// Directory for storing vector database files
const DB_DIR = path.join(__dirname, '../../data/vector-db');

// Simple in-memory vector database
let vectors = [];
const DB_PATH = path.join(DB_DIR, 'support-vectors.json');

/**
 * Load vectors from disk
 * @returns {Promise<Array>} - The loaded vectors
 */
async function loadVectors() {
  return mutex.runExclusive(async () => {
    try {
      // Ensure the directory exists
      if (!fsSync.existsSync(DB_DIR)) {
        await fs.mkdir(DB_DIR, { recursive: true });
      }
      
      if (fsSync.existsSync(DB_PATH)) {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const parsedData = JSON.parse(data);
        if (Array.isArray(parsedData)) {
          vectors = parsedData;
          logger.info(`Loaded ${vectors.length} vectors from local database`);
        }
      } else {
        logger.info('No existing vector database found, starting with empty database');
        vectors = [];
      }
      return vectors;
    } catch (error) {
      logger.error('Error loading vector database:', error);
      return [];
    }
  });
}

// Load vectors on module initialization
loadVectors().catch(err => {
  logger.error('Failed to load vectors during initialization:', err);
});

/**
 * Save the current state of the vector database to disk
 */
async function saveVectorDb() {
  return mutex.runExclusive(async () => {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(vectors), 'utf8');
      logger.info(`Saved ${vectors.length} vectors to local database`);
    } catch (error) {
      logger.error('Error saving vector database:', error);
      throw error;
    }
  });
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array} a - First vector
 * @param {Array} b - Second vector
 * @returns {number} - Similarity score between -1 and 1
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Add a document to the vector database
 * @param {string} text - The text to add
 * @param {Object} metadata - Metadata for the document
 * @returns {Promise<void>}
 */
async function addDocument(text, metadata = {}) {
  try {
    const embedding = await generateEmbedding(text);
    
    await mutex.runExclusive(async () => {
      vectors.push({
        embedding,
        metadata: { text, ...metadata }
      });
      await saveVectorDb();
    });
    
    logger.info('Added document to local vector database');
  } catch (error) {
    logger.error('Error adding document to local vector database:', error);
    throw error;
  }
}

/**
 * Query the vector database for similar documents
 * @param {string|Array} query - The query text or embedding vector
 * @param {number} topK - The number of results to return
 * @returns {Array} - The query results
 */
async function queryLocalVectorDb(query, topK = 3) {
  return mutex.runExclusive(async () => {
    try {
      // Convert query to embedding if it's a string
      let embedding = query;
      if (typeof query === 'string') {
        embedding = await generateEmbedding(query);
      }
      
      // Calculate similarity scores
      const results = vectors.map(item => ({
        similarity: cosineSimilarity(embedding, item.embedding),
        metadata: item.metadata
      }));

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      // Return top K results
      return results.slice(0, topK).map(result => result.metadata.text);
    } catch (error) {
      logger.error('Error querying local vector database:', error);
      return [];
    }
  });
}

/**
 * Initialize the local vector database with sample data
 * @returns {Promise<void>}
 */
async function initLocalVectorDb() {
  // Load vectors first
  await loadVectors();
  
  // Only initialize if the database is empty
  if (vectors.length === 0) {
    logger.info('Initializing local vector database with sample data');

    const sampleDocs = [
      'To duplicate a Notion template, click the "Duplicate" button in the top right corner of the template page. Make sure to select "Include content" if you want all the template content.',
      'If you\'re having trouble with Notion loading, try clearing your browser cache and cookies, or try using a different browser.',
      'Notion supports multiple languages. You can change your language settings by going to Settings & Members > My account > Language & region.',
      'To share a Notion page, click the "Share" button in the top right corner and enter the email addresses of the people you want to share with.',
      'Notion\'s free plan includes unlimited pages and blocks for personal use, but has limitations on collaboration features.'
    ];

    for (const doc of sampleDocs) {
      await addDocument(doc);
    }

    logger.info('Local vector database initialized with sample data');
  }
}

module.exports = {
  queryLocalVectorDb,
  addDocument,
  initLocalVectorDb
};
