const express = require('express');
const path    = require('path');
const cors    = require('cors');
const logger  = require('./utils/logger');
const config  = require('./utils/config');
const { classifyIntent } = require('./utils/openai');
const { initPinecone } = require('./utils/pinecone');
const fs      = require('fs');
const voiceRoutes = require('./routes/voiceRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const supportRoutes = require('./routes/supportRoutes');
const puppeteerRoutes = require('./routes/puppeteerRoutes');

// Add this at the top of your file to ensure we're listening on the right port
const PORT = process.env.PORT || 3001;
console.log(`Attempting to start server on port ${PORT}...`);

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

// Register API routes
app.use('/api/voice', voiceRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/puppeteer', puppeteerRoutes);

// Ensure audio directory exists
const audioDir = path.join(__dirname, '../public/audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
  logger.info(`Created audio directory: ${audioDir}`);
}

// Initialize Pinecone
initPinecone()
  .then(available => {
    logger.info(`Pinecone initialized. Available: ${available}`);
  })
  .catch(err => {
    logger.error('Failed to initialize Pinecone:', err);
  });

// Start the server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Main page available at: http://localhost:${PORT}/`);
  logger.info(`Voice test page available at: http://localhost:${PORT}/voice-test.html`);
  logger.info(`Support test page available at: http://localhost:${PORT}/support-test.html`);
});  // ← Make sure this closes your callback AND listen call

// Export for testing
module.exports = app;
