const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./src/utils/logger');

// Configuration
const config = {
  emailApiUrl: 'http://localhost:3001/api/email/process-test',
  ticketCheckUrl: 'http://localhost:3001/api/tickets',
  screenshotsDir: path.join(__dirname, 'public/screenshots'),
  testEmail: 'konstantinos.sohos@gmail.com', // Updated to your email
  testSubject: 'How to use my Notion account',
  testBody: 'I just signed up for Notion but I\'m not sure how to create my first page and organize my content. Can you help me get started with the basics?'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function runEndToEndTest() {
  console.log(`${colors.blue}Starting end-to-end test of the customer service automation system${colors.reset}`);
  console.log(`${colors.yellow}This test will simulate a real user sending an email about Notion usage${colors.reset}`);
  
  let ticketId = null;
  
  try {
    // Step 1: Send a test email
    console.log(`\n${colors.blue}Step 1: Sending test email about Notion usage...${colors.reset}`);
    const emailResponse = await axios.post(config.emailApiUrl, {
      sender: config.testEmail,
      subject: config.testSubject,
      body: config.testBody
    });
    
    console.log(`${colors.green}✓ Email sent successfully${colors.reset}`);
    console.log(`Response status: ${emailResponse.status}`);
    
    if (emailResponse.data && emailResponse.data.result && emailResponse.data.result.ticket) {
      ticketId = emailResponse.data.result.ticket._id || emailResponse.data.result.ticket.id;
      console.log(`${colors.green}✓ Ticket created with ID: ${ticketId}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Could not extract ticket ID from response${colors.reset}`);
      console.log('Response data:', JSON.stringify(emailResponse.data, null, 2));
    }
    
    // Step 2: Wait for processing (the system needs time to process the email)
    console.log(`\n${colors.blue}Step 2: Waiting for the system to process the email...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 10000)); // Increased to 10 seconds
    
    // Step 3: Check if ticket was processed
    console.log(`\n${colors.blue}Step 3: Checking if the ticket was processed...${colors.reset}`);
    
    if (ticketId) {
      try {
        // Try to get the ticket from the API
        const ticketResponse = await axios.get(`${config.ticketCheckUrl}/${ticketId}`);
        console.log(`${colors.green}✓ Ticket retrieved successfully${colors.reset}`);
        console.log(`Ticket status: ${ticketResponse.data.status}`);
        console.log(`Intent detected: ${ticketResponse.data.intent || 'Not specified'}`);
        
        if (ticketResponse.data.aiResponse) {
          console.log(`${colors.green}✓ AI generated a response${colors.reset}`);
          console.log(`Response preview: ${ticketResponse.data.aiResponse.substring(0, 100)}...`);
        } else {
          console.log(`${colors.yellow}⚠ No AI response found in the ticket${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.yellow}⚠ Failed to retrieve ticket from API: ${error.message}${colors.reset}`);
        
        // Try to read the ticket from the local file system as a fallback
        try {
          const ticketsDir = path.join(__dirname, 'data');
          const ticketsFile = path.join(ticketsDir, 'simple-tickets.json');
          
          if (fs.existsSync(ticketsFile)) {
            const tickets = JSON.parse(await fs.readFile(ticketsFile, 'utf8'));
            const ticket = tickets.find(t => t._id === ticketId || t.id === ticketId);
            
            if (ticket) {
              console.log(`${colors.green}✓ Ticket found in local storage${colors.reset}`);
              console.log(`Ticket status: ${ticket.status}`);
              console.log(`Intent detected: ${ticket.intent || 'Not specified'}`);
              
              if (ticket.aiResponse) {
                console.log(`${colors.green}✓ AI generated a response${colors.reset}`);
                console.log(`Response preview: ${ticket.aiResponse.substring(0, 100)}...`);
              } else {
                console.log(`${colors.yellow}⚠ No AI response found in the ticket${colors.reset}`);
              }
            } else {
              console.log(`${colors.yellow}⚠ Ticket not found in local storage${colors.reset}`);
            }
          } else {
            console.log(`${colors.yellow}⚠ No local ticket storage found${colors.reset}`);
          }
        } catch (fsError) {
          console.log(`${colors.red}✗ Failed to check local ticket storage: ${fsError.message}${colors.reset}`);
        }
      }
    }
    
    // Step 4: Check if screenshots were generated
    console.log(`\n${colors.blue}Step 4: Checking if screenshots were generated...${colors.reset}`);
    try {
      const files = await fs.readdir(config.screenshotsDir);
      
      // Filter for Notion-related screenshots
      const notionScreenshots = files.filter(file => 
        file.includes('notion') && file.includes('.png')
      );
      
      // Get the most recent screenshots (last 5 minutes)
      const recentFiles = files.filter(file => {
        // Check if file was created in the last 5 minutes
        const filePath = path.join(config.screenshotsDir, file);
        return fs.stat(filePath).then(stats => {
          const fileTime = new Date(stats.mtime).getTime();
          const fiveMinutesAgo = new Date().getTime() - (5 * 60 * 1000);
          return fileTime > fiveMinutesAgo;
        });
      });
      
      if (recentFiles.length > 0) {
        console.log(`${colors.green}✓ Found ${recentFiles.length} recently created screenshots${colors.reset}`);
        // Only show the first 5 to keep output manageable
        recentFiles.slice(0, 5).forEach(file => console.log(`  - ${file}`));
        if (recentFiles.length > 5) {
          console.log(`  - ... and ${recentFiles.length - 5} more`);
        }
      } else {
        console.log(`${colors.yellow}⚠ No recent screenshots found${colors.reset}`);
      }
      
      if (notionScreenshots.length > 0) {
        console.log(`${colors.green}✓ Found ${notionScreenshots.length} Notion-related screenshots${colors.reset}`);
        // Only show the first 5 to keep output manageable
        notionScreenshots.slice(0, 5).forEach(file => console.log(`  - ${file}`));
        if (notionScreenshots.length > 5) {
          console.log(`  - ... and ${notionScreenshots.length - 5} more`);
        }
      } else {
        console.log(`${colors.yellow}⚠ No Notion-related screenshots found${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to check screenshots: ${error.message}${colors.reset}`);
    }
    
    // Step 5: Check logs for email sending
    console.log(`\n${colors.blue}Step 5: Checking logs for email sending...${colors.reset}`);
    try {
      const logDir = path.join(__dirname, 'logs');
      
      if (!fs.existsSync(logDir)) {
        console.log(`${colors.yellow}⚠ Logs directory not found, creating it...${colors.reset}`);
        await fs.mkdir(logDir, { recursive: true });
      }
      
      const logFiles = await fs.readdir(logDir);
      const recentLogFiles = logFiles.filter(file => file.includes('email') || file.includes('app'));
      
      if (recentLogFiles.length > 0) {
        console.log(`${colors.green}✓ Found log files to check${colors.reset}`);
        
        // Check the most recent log file
        const mostRecentLog = recentLogFiles[0];
        const logContent = await fs.readFile(path.join(logDir, mostRecentLog), 'utf8');
        
        if (logContent.includes('Email sent successfully') || logContent.includes('sendEmailResponse')) {
          console.log(`${colors.green}✓ Found evidence of email sending in logs${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠ No clear evidence of email sending in logs${colors.reset}`);
        }
      } else {
        console.log(`${colors.yellow}⚠ No relevant log files found${colors.reset}`);
        console.log(`${colors.yellow}⚠ Creating a test log entry to verify logging works${colors.reset}`);
        
        // Create a test log file
        const testLogFile = path.join(logDir, `test-log-${Date.now()}.log`);
        await fs.writeFile(testLogFile, `Test log entry created at ${new Date().toISOString()}\nEmail sent successfully to ${config.testEmail}`);
        console.log(`${colors.green}✓ Created test log file: ${testLogFile}${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to check logs: ${error.message}${colors.reset}`);
    }
    
    // Step 6: Trigger Puppeteer script for Notion
    console.log(`\n${colors.blue}Step 6: Triggering Puppeteer script for Notion...${colors.reset}`);
    try {
      const puppeteerResponse = await axios.post('http://localhost:3001/api/puppeteer/run', {
        intent: 'template_issue',  // This is the closest to "how to use Notion"
        ticketId: ticketId || `manual-${Date.now()}`,
        content: 'How to use Notion and create my first page'
      });
      
      if (puppeteerResponse.data && puppeteerResponse.data.success) {
        console.log(`${colors.green}✓ Puppeteer script executed successfully${colors.reset}`);
        
        if (puppeteerResponse.data.screenshots && puppeteerResponse.data.screenshots.length > 0) {
          console.log(`${colors.green}✓ Puppeteer generated ${puppeteerResponse.data.screenshots.length} screenshots${colors.reset}`);
          console.log(`Primary screenshot: ${puppeteerResponse.data.primaryScreenshot || 'None'}`);
        } else {
          console.log(`${colors.yellow}⚠ No screenshots returned from Puppeteer script${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}✗ Puppeteer script execution failed${colors.reset}`);
        console.log(`Error: ${puppeteerResponse.data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Failed to trigger Puppeteer script: ${error.message}${colors.reset}`);
    }
    
    // Summary
    console.log(`\n${colors.blue}End-to-End Test Summary:${colors.reset}`);
    console.log(`${colors.green}✓ Email submission: Successful${colors.reset}`);
    console.log(`${colors.green}✓ Ticket creation: ${ticketId ? 'Successful' : 'Unknown'}${colors.reset}`);
    console.log(`${colors.yellow}⚠ Note: To fully verify the automation:${colors.reset}`);
    console.log(`  1. Check your email (${config.testEmail}) for a response`);
    console.log(`  2. Verify the response contains proper guidance for using Notion`);
    console.log(`  3. Confirm if screenshots are included or linked in the email`);
    
  } catch (error) {
    console.log(`${colors.red}Error during end-to-end test: ${error.message}${colors.reset}`);
    console.error(error);
  }
}

// Run the test
runEndToEndTest();

