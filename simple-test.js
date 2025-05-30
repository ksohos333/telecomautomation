const axios = require('axios');

async function testEmailApi() {
  try {
    const response = await axios.post('http://localhost:3003/api/email/process-test', {
      sender: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email body'
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    throw error;
  }
}

// Run the test
testEmailApi()
  .then(result => {
    console.log('Test completed successfully');
  })
  .catch(error => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });


