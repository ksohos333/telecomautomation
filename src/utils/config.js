const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
const config = {
  // Server
  port: Number(process.env.PORT) || 3001,
  httpLogFormat: process.env.HTTP_LOG_FORMAT || 'combined',
  
  // MongoDB
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'telecom_support',
  useLocalDb: process.env.USE_LOCAL_DB === 'true' || false,
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  completionModel: process.env.COMPLETION_MODEL || 'gpt-4',
  
  // Pinecone
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeEnv: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
  pineconeIndex: process.env.PINECONE_INDEX || 'notion-support',
  
  // Email/SMTP
  smtpHost: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true' || false,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASSWORD || '',
  fromEmail: process.env.FROM_EMAIL || 'support@yourdomain.com',
  
  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Base URL
  BASE_URL: process.env.BASE_URL || 'http://localhost:3001',
  
  // Google Cloud
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  
  // Webhook
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  webhookEndpoint: process.env.WEBHOOK_ENDPOINT || '/api/webhook',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || path.join(__dirname, '../../logs'),
  
  // Puppeteer
  puppeteerHeadless: process.env.PUPPETEER_HEADLESS !== 'false',
  puppeteerTimeout: Number(process.env.PUPPETEER_TIMEOUT) || 30000,
  screenshotsDir: process.env.SCREENSHOTS_DIR || path.join(__dirname, '../../public/screenshots'),
  
  // Local DB
  localDbDir: process.env.LOCAL_DB_DIR || path.join(__dirname, '../../data/local-db'),
  vectorDbDir: process.env.VECTOR_DB_DIR || path.join(__dirname, '../../data/vector-db'),
  
  // Environment
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  isTest: process.env.NODE_ENV === 'test',
};

// Fail fast on missing critical configuration
function validateConfig() {
  const criticalErrors = [];
  
  // Check OpenAI API key
  if (!config.openaiApiKey) {
    criticalErrors.push('OPENAI_API_KEY is required');
  }
  
  // Check Pinecone API key if not using local DB
  if (!config.useLocalDb && !config.pineconeApiKey) {
    criticalErrors.push('PINECONE_API_KEY is required when not using local DB');
  }
  
  // If using SMTP, check credentials
  if (config.smtpUser && !config.smtpPass) {
    criticalErrors.push('SMTP_PASSWORD is required when SMTP_USER is provided');
  }
  
  // If there are critical errors, throw an error
  if (criticalErrors.length > 0) {
    throw new Error(`Configuration error: ${criticalErrors.join(', ')}`);
  }
}

// Validate configuration
validateConfig();

module.exports = config;
