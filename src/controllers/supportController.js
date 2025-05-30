const { generateEmbedding, classifyIntent, generateResponse } = require('../utils/openai');
const { queryPinecone, isPineconeAvailable } = require('../utils/pinecone');
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

// Initialize cache with 10-minute TTL
const responseCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const intentCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });

// Metrics tracking
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  avgResponseTime: 0,
  cacheHits: 0,
  cacheMisses: 0
};

/**
 * Validate and sanitize input
 * @param {Object} input - The input to validate
 * @returns {Object} - Validation result with errors if any
 */
function validateInput(input) {
  const errors = [];

  // Check if content exists and is a string
  if (!input.content) {
    errors.push('Content is required');
  } else if (typeof input.content !== 'string') {
    errors.push('Content must be a string');
  } else if (input.content.length > 5000) {
    errors.push('Content is too long (max 5000 characters)');
  }

  // Sanitize content if it exists
  if (input.content) {
    // Remove any HTML tags
    input.content = input.content.replace(/<[^>]*>?/gm, '');
    // Trim whitespace
    input.content = input.content.trim();
  }

  // Check if ticketId exists
  if (!input.ticketId) {
    // Generate a ticketId if not provided
    input.ticketId = `ticket-${Date.now()}`;
  } else if (typeof input.ticketId !== 'string') {
    errors.push('TicketId must be a string');
  }

  // Check if userEmail is valid
  if (input.userEmail && typeof input.userEmail !== 'string') {
    errors.push('UserEmail must be a string');
  } else if (input.userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.userEmail)) {
    errors.push('UserEmail must be a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedInput: input
  };
}

/**
 * Get cached response if available
 * @param {string} content - The content to check in cache
 * @returns {Object|null} - Cached response or null
 */
function getCachedResponse(content) {
  // Create a cache key from the content
  const cacheKey = `response-${Buffer.from(content).toString('base64').substring(0, 32)}`;

  // Check if we have a cached response
  const cachedResponse = responseCache.get(cacheKey);

  if (cachedResponse) {
    metrics.cacheHits++;
    logger.info(`Cache hit for response: ${cacheKey}`);
    return cachedResponse;
  }

  metrics.cacheMisses++;
  logger.info(`Cache miss for response: ${cacheKey}`);
  return null;
}

/**
 * Cache a response for future use
 * @param {string} content - The content used as cache key
 * @param {Object} response - The response to cache
 */
function cacheResponse(content, response) {
  // Create a cache key from the content
  const cacheKey = `response-${Buffer.from(content).toString('base64').substring(0, 32)}`;

  // Cache the response
  responseCache.set(cacheKey, response);
  logger.info(`Cached response for: ${cacheKey}`);
}

/**
 * Get metrics for the support controller
 * @returns {Object} - Current metrics
 */
function getMetrics() {
  return {
    ...metrics,
    cacheStats: {
      responseCache: responseCache.getStats(),
      intentCache: intentCache.getStats()
    }
  };
}

/**
 * Handle a support request
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @returns {Promise<void>}
 */
async function handleSupportRequest(req, res) {
  const startTime = Date.now();
  metrics.totalRequests++;

  try {
    // Extract and validate input
    const { isValid, errors, sanitizedInput } = validateInput(req.body);
    const { ticketId, content } = sanitizedInput;

    // Return validation errors if any
    if (!isValid) {
      metrics.failedRequests++;
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Check for cached response
    const cachedResponse = getCachedResponse(content);
    if (cachedResponse) {
      // Update metrics
      const duration = Date.now() - startTime;
      metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.successfulRequests) + duration) / (metrics.successfulRequests + 1);
      metrics.successfulRequests++;

      logger.info(`Returning cached response for ticket ${ticketId} in ${duration}ms`);

      // Return cached response with the current ticketId
      return res.json({
        ...cachedResponse,
        ticketId
      });
    }

    // 1. Classify intent
    let intent;
    const intentCacheKey = `intent-${Buffer.from(content).toString('base64').substring(0, 32)}`;
    const cachedIntent = intentCache.get(intentCacheKey);

    if (cachedIntent) {
      intent = cachedIntent;
      logger.info(`Using cached intent classification: ${intent}`);
    } else {
      intent = await classifyIntent(content);
      intentCache.set(intentCacheKey, intent);
      logger.info(`Intent classified as: ${intent}`);
    }

    // 2. Handle edge cases
    if (intent === 'refund') {
      const response = {
        ticketId,
        reply: 'I see you\'re asking about a refund. This request has been escalated to our billing team who will contact you shortly.',
        status: 'escalated',
        intent
      };

      // Cache the response
      cacheResponse(content, response);

      // Update metrics
      const duration = Date.now() - startTime;
      metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.successfulRequests) + duration) / (metrics.successfulRequests + 1);
      metrics.successfulRequests++;

      logger.info(`Handled refund request for ticket ${ticketId} in ${duration}ms`);
      return res.json(response);
    }

    if (intent === 'missing_info') {
      const response = {
        ticketId,
        reply: 'Thank you for your message. Could you please provide more details about your issue so we can better assist you?',
        status: 'needs_info',
        intent
      };

      // Cache the response
      cacheResponse(content, response);

      // Update metrics
      const duration = Date.now() - startTime;
      metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.successfulRequests) + duration) / (metrics.successfulRequests + 1);
      metrics.successfulRequests++;

      logger.info(`Requested more info for ticket ${ticketId} in ${duration}ms`);
      return res.json(response);
    }

    let reply;
    try {
      // 3. Generate embedding for vector search
      const embedding = await generateEmbedding(content);

      // 4. Query vector database for relevant docs
      const docs = await queryPinecone(embedding);
      logger.info(`Retrieved ${docs.length} relevant documents for ticket ${ticketId}`);

      // 5. Generate response
      reply = await generateResponse(content, docs);
    } catch (error) {
      logger.error('Error with vector search or response generation:', error);

      // Fallback response for template issues
      if (intent === 'template_issue') {
        reply = "I see you're having trouble with your Notion template. Try these steps: 1) Make sure you selected 'Include content' when duplicating. 2) Check your internet connection. 3) Clear your browser cache. 4) Try using a different browser. If the issue persists, please provide more details about the specific problem you're experiencing.";
      } else {
        // Generic fallback response
        reply = `Thank you for your message about "${content.substring(0, 30)}...". Our team will review your request and get back to you soon.`;
      }

      logger.info(`Using fallback response for ticket ${ticketId} with intent ${intent}`);
    }

    // 6. Prepare and cache response
    const response = {
      ticketId,
      reply,
      status: 'completed',
      intent,
      pineconeAvailable: isPineconeAvailable()
    };

    // Cache the response
    cacheResponse(content, response);

    // 7. Return response
    res.json(response);

    // Update metrics
    const duration = Date.now() - startTime;
    metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.successfulRequests) + duration) / (metrics.successfulRequests + 1);
    metrics.successfulRequests++;

    logger.info(`Successfully handled ticket ${ticketId} in ${duration}ms`);
  } catch (error) {
    // Update metrics
    metrics.failedRequests++;

    logger.error('Error handling support request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  handleSupportRequest,
  getMetrics
};
