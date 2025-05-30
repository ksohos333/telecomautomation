const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

// Ensure test-audio directory exists
const testAudioDir = path.join(__dirname, 'test-audio');
if (!fs.existsSync(testAudioDir)) {
  fs.mkdirSync(testAudioDir, { recursive: true });
}

// Create a simple README file explaining how to create test audio
const readmePath = path.join(testAudioDir, 'README.txt');
fs.writeFileSync(readmePath, `
TEST AUDIO FILES

This directory contains test audio files for the voice recognition system.

Since we can't generate actual audio files programmatically without additional tools,
you'll need to create your own test audio files:

1. Use a tool like Audacity to record a short question about Notion
2. Save it as a WAV file named "notion-question.wav" in this directory
3. Make sure it's a clear recording with minimal background noise

Alternatively, you can use online text-to-speech services to generate audio files.

For testing purposes, you can also use the text-based testing in the voice-test.html page.
`);

// Create a placeholder file
const placeholderPath = path.join(testAudioDir, 'notion-question.wav.placeholder');
fs.writeFileSync(placeholderPath, 'This is a placeholder. Replace with an actual WAV file.');

logger.info(`Created test audio directory at ${testAudioDir}`);
logger.info(`Created README at ${readmePath}`);
logger.info(`Created placeholder file at ${placeholderPath}`);
logger.info('Please create or obtain a real audio file for testing.');

console.log('\nTest audio directory setup complete!');
console.log(`Please place your test audio files in: ${testAudioDir}`);