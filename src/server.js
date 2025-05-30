// src/server.js
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const logger = require('./utils/logger');
const config = require('./utils/config');
const puppeteerRoutes = require('./routes/puppeteerRoutes');
const supportRoutes = require('./routes/supportRoutes');
const emailRoutes = require('./routes/emailRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

const app = express();

// 1️⃣ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2️⃣ CORS configuration - Allow Twilio domains
const corsOptions = {
  origin: ['https://api.twilio.com', 'https://taskrouter.twilio.com', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Twilio-Signature'],
  credentials: true
};
app.use(cors(corsOptions));

// 3️⃣ Request logging middleware with Morgan
app.use(morgan('combined', { stream: logger.stream }));

// 4️⃣ Mount API routers BEFORE static
app.use('/api/puppeteer', puppeteerRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/voice', voiceRoutes);

// 5️⃣ Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'telecom-auto', timestamp: new Date().toISOString() });
});

app.get('/api/webhook/whatsapp/health', (req, res) => {
  res.status(200).send('WhatsApp webhook is healthy');
});

app.get('/api/voice/health', (req, res) => {
  res.status(200).json({ status: 'Voice service is running' });
});

// 6️⃣ Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// 7️⃣ 404 handler (must come after all routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 8️⃣ Global error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 9️⃣ Graceful shutdown
const { closeMongoDB } = require('./utils/mongodb');
async function shutdown() {
  logger.info('Shutting down…');
  await closeMongoDB();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 🔟 Start server
const PORT = config.port;
app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
