// A simple script to check if the server is running correctly
const http = require('http');
const logger = require('./src/utils/logger');

logger.info('Checking server on port 3001...');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  logger.info(`STATUS: ${res.statusCode}`);
  logger.info(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    logger.info(`BODY: ${data.substring(0, 200)}...`);
    logger.info('Server check complete');
  });
});

req.on('error', (e) => {
  logger.error(`Problem with request: ${e.message}`);
  logger.error('Server might not be running on port 3001');
});

req.end();