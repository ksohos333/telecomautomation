const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const config = require('./config');
const logger = require('./logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pineconeApiKey,
});

// Sample Notion documentation
const notionDocs = [
  {
    title: 'How to use templates in Notion',
    content: 'To use a template in Notion, click on the "Templates" button in the left sidebar. Browse the template gallery and click on the template you want to use. Click "Duplicate" to add it to your workspace. Make sure to select "Include content" to get all the linked databases and content.'
  },
  {
    title: 'Troubleshooting template issues',
    content: 'If your template isn\'t loading properly, try the following: 1) Make sure you selected "Include content" when duplicating. 2) Check your internet connection. 3) Clear your browser cache. 4) Try using a different browser. 5) Contact support if the issue persists.'
  },
  {
    title: 'Creating content in Notion',
    content: 'To create content in Notion, click the "+" button in the left sidebar. Choose the type of page you want to create. Use the "/" command to add blocks like text, headings, lists, tables, and more. You can also embed files, images, and other media.'
  },
  {
    title: 'Payment and refund policy',
    content: 'Notion offers a 7-day refund policy for all paid plans. To request a refund, contact our support team with your account email and reason for the refund. For monthly plans, we can process a prorated refund for unused time. For annual plans, we can offer a full refund within 30 days of purchase.'
  },
  {
    title: 'Notion AI features',
    content: 'Notion AI can help you write faster, summarize content, generate ideas, and more. To use Notion AI, click on the "AI" button in the toolbar or use the "/ai" command. You can ask it to write, summarize, brainstorm, edit, or translate content.'
  }
];

/**
 * Generate embedding for a text
 * @param {string} text - The text to generate embedding for
 * @returns {Promise<Array>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Populate Pinecone with sample Notion documentation
 */
async function populatePinecone() {
  try {
    logger.info('Checking if index exists...');

    // Check if the index exists
    const response = await pinecone.listIndexes();
    const indexList = response.indexes || [];
    const indexExists = indexList.some(index => index.name === config.pineconeIndex);

    if (!indexExists) {
      logger.info(`Index "${config.pineconeIndex}" does not exist. Please create it in the Pinecone dashboard.`);
      logger.info('Dimensions should be 1536 for OpenAI embeddings.');
      return;
    }

    logger.info('Pinecone index found. Starting to populate...');

    // Get the index
    const index = pinecone.index(config.pineconeIndex);

    // Generate embeddings and upsert to Pinecone
    for (let i = 0; i < notionDocs.length; i++) {
      const doc = notionDocs[i];
      const text = `${doc.title}\n\n${doc.content}`;

      // Generate embedding
      const embedding = await generateEmbedding(text);

      // Upsert to Pinecone
      await index.upsert([
        {
          id: `doc-${i}`,
          values: embedding,
          metadata: {
            title: doc.title,
            text
          }
        }
      ]);

      logger.info(`Upserted document ${i + 1}/${notionDocs.length}`);
    }

    logger.info('Pinecone populated successfully');
  } catch (error) {
    logger.error('Error populating Pinecone:', error);
  }
}

// Run the script
populatePinecone();
