const axios = require('axios');
const logger = require('../utils/logger');

// Simple function to make a POST request
async function testEmailApi() {
  try {
    const response = await axios.post('http://localhost:3007/api/email/process-test', {
      sender: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email body'
    });
    
    logger.info('Status:', response.status);
    logger.info('Headers:', response.headers);
    logger.info('Response data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error('Error response:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error('Error setting up request:', error.message);
    }
    
    throw error;
  }
}

// Run the test
testEmailApi()
  .then(result => {
    logger.info('Test completed successfully');
  })
  .catch(error => {
    logger.error('Test failed:', error.message);
    process.exit(1);
  });
