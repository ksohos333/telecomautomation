const { OpenAI } = require('openai');
const logger = require('./logger');
const config = require('./config');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * Generate embeddings for a text
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<Array>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: config.embeddingModel,
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Classify the intent of a support request
 * @param {string} content - The content of the support request
 * @returns {Promise<string>} - The classified intent
 */
async function classifyIntent(content) {
  try {
    const response = await openai.chat.completions.create({
      model: config.completionModel,
      messages: [
        {
          role: 'system',
          content: 'Classify the following support request into one of these categories: template_issue, refund, multi_lang, missing_info, notion_basics, vpn_connection, screen_share_issue, other'
        },
        {
          role: 'user',
          content
        }
      ]
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error('Error classifying intent:', error);
    throw error;
  }
}

/**
 * Generate a response with enhanced context
 * @param {string} content - The user's query
 * @param {Array<string>} docs - Relevant documentation
 * @param {string} systemPrompt - Custom system prompt
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(content, docs = [], systemPrompt = '') {
  try {
    const docsText = docs.join('\n\n');
    
    // Use custom system prompt if provided, otherwise use default
    const finalSystemPrompt = systemPrompt || 
      `You are a Notion support agent. Use these docs to help answer the user's question:\n\n${docsText}\n\nIf you don't know the answer, or if this is a refund request, politely say you'll escalate to a human agent.`;
    
    const response = await openai.chat.completions.create({
      model: config.completionModel,
      messages: [
        {
          role: 'system',
          content: finalSystemPrompt
        },
        {
          role: 'user',
          content
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error('Error generating response:', error);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
  classifyIntent,
  generateResponse
};
