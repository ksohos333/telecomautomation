const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./src/utils/logger') || console;
const { initPinecone } = require('./src/utils/pinecone');
const { handleIncomingCall, generateVoiceResponse } = require('./src/controllers/voiceController');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'audio', 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `recording-${Date.now()}.wav`);
  }
});
const upload = multer({ storage: storage });

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'audio', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS configuration - Allow Twilio domains
const corsOptions = {
  origin: ['https://api.twilio.com', 'https://taskrouter.twilio.com', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Twilio-Signature'],
  credentials: true
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const voiceRoutes = require('./src/routes/voiceRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const puppeteerRoutes = require('./src/routes/puppeteerRoutes');

// Basic routes
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Mount API routes
app.use('/api/voice', voiceRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/puppeteer', puppeteerRoutes);

// Voice API routes
app.post('/api/voice/tickets/:ticketId/response', generateVoiceResponse);

// Health check endpoint for voice service
app.get('/api/voice/health', (req, res) => {
  res.status(200).json({ status: 'Voice service is running' });
});

// Handle audio uploads
app.post('/api/voice/call/:callId', upload.single('audio'), handleIncomingCall);

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize Pinecone
initPinecone()
  .then(available => {
    logger.info(`Pinecone initialized. Available: ${available}`);
  })
  .catch(err => {
    logger.error('Failed to initialize Pinecone:', err);
  });

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server listening on ${PORT}`);
  
  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    logger.info(`Screenshots directory created at ${screenshotsDir}`);
  }
  
  // Create sample screenshots if they don't exist
  const sampleScreenshots = [
    'notion-new-page-1.png',
    'notion-new-page-2.png',
    'vpn-setup-1.png',
    'vpn-setup-2.png',
    'screen-share-1.png',
    'screen-share-2.png'
  ];
  
  sampleScreenshots.forEach(screenshot => {
    const screenshotPath = path.join(screenshotsDir, screenshot);
    if (!fs.existsSync(screenshotPath)) {
      fs.writeFileSync(screenshotPath, 'Sample screenshot');
      logger.info(`Created sample screenshot: ${screenshotPath}`);
    }
  });
  
  // Ensure audio directory exists
  const audioDir = path.join(__dirname, 'public', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    logger.info(`Audio directory created at ${audioDir}`);
  }
  
  // Create sample audio file if it doesn't exist
  const sampleAudioPath = path.join(audioDir, 'sample-response.mp3');
  if (!fs.existsSync(sampleAudioPath)) {
    fs.writeFileSync(sampleAudioPath, 'Sample audio file');
    logger.info(`Created sample audio file: ${sampleAudioPath}`);
  }
  
  logger.info(`Server is ready at http://localhost:${PORT}/`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down…');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

// Prevent immediate shutdown
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  // Don't exit the process
});
