const axios = require('axios');

// Configuration
const config = {
  emailApiUrl: 'http://localhost:3001/api/email/process-test',
  userEmail: 'konstantinos.sohos@gmail.com',
  subject: 'How to use my Notion account',
  body: 'I just signed up for Notion but I\'m not sure how to create my first page and organize my content. Can you help me get started with the basics?'
};

async function sendTestEmail() {
  console.log('Sending test email about Notion usage...');
  
  try {
    const response = await axios.post(config.emailApiUrl, {
      sender: config.userEmail,
      subject: config.subject,
      body: config.body
    });
    
    console.log('Email sent successfully!');
    console.log('Response status:', response.status);
    
    if (response.data && response.data.result && response.data.result.ticket) {
      const ticketId = response.data.result.ticket._id || response.data.result.ticket.id;
      console.log('Ticket created with ID:', ticketId);
      console.log('\nPlease check your email inbox for a response.');
      console.log('It may take a few minutes for the system to process the request and send the email.');
    } else {
      console.log('Could not extract ticket ID from response');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('Error sending test email:', error.message);
    console.error('Make sure all services are running (run-all-services.bat)');
  }
}

// Run the function
sendTestEmail();

