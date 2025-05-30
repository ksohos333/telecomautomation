const { handleSupportRequest } = require('./src/controllers/supportController');

// Mock Express request and response objects
const req = {
  body: {
    ticketId: '12345',
    content: 'I\'m having trouble with my Notion template',
    userEmail: 'test@example.com'
  }
};

const res = {
  status: function(statusCode) {
    console.log('Status:', statusCode);
    return this;
  },
  json: function(data) {
    console.log('Response data:', JSON.stringify(data, null, 2));
    return this;
  }
};

// Call the controller function
console.log('Testing supportController.handleSupportRequest...');
handleSupportRequest(req, res)
  .then(() => {
    console.log('Test completed successfully');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });
