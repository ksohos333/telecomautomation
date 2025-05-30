const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const logger = require('./src/utils/logger');

// Configuration
const config = {
  voiceApiUrl: 'http://localhost:3001/api/voice',
  puppeteerApiUrl: 'http://localhost:3001/api/puppeteer/run',
  testAudioFile: path.join(__dirname, 'test-audio', 'notion-question.wav'),
  testText: 'How do I create a new page in Notion and organize my content?'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function testVoiceWithText() {
  console.log(`${colors.blue}Testing voice response with text input...${colors.reset}`);
  
  try {
    // Generate a random ticket ID
    const ticketId = `test-${Date.now()}`;
    
    console.log(`${colors.yellow}Sending text request: "${config.testText}"${colors.reset}`);
    
    // Send the text to the voice API
    const response = await axios.post(`${config.voiceApiUrl}/tickets/${ticketId}/response`, {
      content: config.testText
    });
    
    console.log(`${colors.green}✓ Voice response generated successfully${colors.reset}`);
    console.log(`Text response: ${response.data.textResponse.substring(0, 100)}...`);
    console.log(`Audio URL: ${response.data.audioUrl}`);
    
    // Check if Puppeteer was triggered
    if (response.data.puppeteerResult) {
      console.log(`${colors.green}✓ Puppeteer script was triggered automatically${colors.reset}`);
      console.log(`Intent detected: ${response.data.intent}`);
      
      if (response.data.puppeteerResult.screenshots) {
        console.log(`${colors.green}✓ Screenshots generated: ${response.data.puppeteerResult.screenshots.length}${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}⚠ No Puppeteer script was triggered${colors.reset}`);
      
      // Try to manually trigger Puppeteer for "template_issue" intent
      console.log(`${colors.blue}Manually triggering Puppeteer for "template_issue" intent...${colors.reset}`);
      
      const puppeteerResponse = await axios.post(config.puppeteerApiUrl, {
        intent: 'template_issue',
        ticketId: ticketId,
        content: config.testText
      });
      
      if (puppeteerResponse.data.success) {
        console.log(`${colors.green}✓ Puppeteer script executed successfully${colors.reset}`);
        console.log(`Screenshots: ${puppeteerResponse.data.screenshots?.length || 0}`);
      } else {
        console.log(`${colors.red}✗ Puppeteer script execution failed${colors.reset}`);
        console.log(`Error: ${puppeteerResponse.data.error}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Error testing voice with text: ${error.message}${colors.reset}`);
    console.error(error);
    return false;
  }
}

async function testVoiceWithAudio() {
  console.log(`\n${colors.blue}Testing voice response with audio input...${colors.reset}`);
  
  // Check if test audio file exists
  if (!fs.existsSync(config.testAudioFile)) {
    console.log(`${colors.yellow}⚠ Test audio file not found: ${config.testAudioFile}${colors.reset}`);
    console.log(`${colors.yellow}Skipping audio test. Please record a test audio file first.${colors.reset}`);
    return false;
  }
  
  try {
    // Generate a random call ID
    const callId = `call-${Date.now()}`;
    
    // Create form data with audio file
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(config.testAudioFile));
    
    console.log(`${colors.yellow}Sending audio file: ${config.testAudioFile}${colors.reset}`);
    
    // Send the audio to the voice API
    const response = await axios.post(`${config.voiceApiUrl}/call/${callId}`, formData, {
      headers: formData.getHeaders()
    });
    
    console.log(`${colors.green}✓ Voice response generated successfully${colors.reset}`);
    console.log(`Transcription: ${response.data.transcription}`);
    console.log(`Response text: ${response.data.responseText.substring(0, 100)}...`);
    console.log(`Audio URL: ${response.data.audioUrl}`);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Error testing voice with audio: ${error.message}${colors.reset}`);
    console.error(error);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.blue}Starting voice and Puppeteer integration tests${colors.reset}`);
  
  // Create test-audio directory if it doesn't exist
  const testAudioDir = path.join(__dirname, 'test-audio');
  if (!fs.existsSync(testAudioDir)) {
    fs.mkdirSync(testAudioDir, { recursive: true });
    console.log(`${colors.yellow}Created test-audio directory${colors.reset}`);
  }
  
  // Test voice with text
  const textTestResult = await testVoiceWithText();
  
  // Test voice with audio (if available)
  const audioTestResult = await testVoiceWithAudio();
  
  // Summary
  console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
  console.log(`Text-based voice test: ${textTestResult ? colors.green + '✓ Passed' : colors.red + '✗ Failed'}${colors.reset}`);
  console.log(`Audio-based voice test: ${audioTestResult ? colors.green + '✓ Passed' : colors.yellow + '⚠ Skipped/Failed'}${colors.reset}`);
  
  console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
  console.log(`1. Open http://localhost:3001/voice-test.html in your browser to test interactively`);
  console.log(`2. Record a question about Notion, VPN setup, or screen sharing`);
  console.log(`3. Check if the system correctly transcribes your question`);
  console.log(`4. Verify that Puppeteer generates screenshots for visual guidance`);
}

// Run the tests
runTests();