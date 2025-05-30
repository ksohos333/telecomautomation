const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ensure test-audio directory exists
const testAudioDir = path.join(__dirname, 'test-audio');
if (!fs.existsSync(testAudioDir)) {
  fs.mkdirSync(testAudioDir, { recursive: true });
}

// Output file path
const outputFile = path.join(testAudioDir, 'notion-question.wav');

console.log('This script will record a test audio file for voice testing.');
console.log('Please speak a question about Notion, VPN setup, or screen sharing.');
console.log('For example: "How do I create a new page in Notion?"');
console.log('\nPress Enter to start recording (5 seconds)...');

rl.question('', () => {
  console.log('Recording started... (speak now)');
  
  // Use SoX for recording (must be installed on the system)
  const rec = spawn('sox', ['-d', outputFile, 'trim', '0', '5']);
  
  rec.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  rec.stderr.on('data', (data) => {
    console.log(`Recording in progress...`);
  });
  
  rec.on('close', (code) => {
    console.log(`Recording completed and saved to: ${outputFile}`);
    console.log('You can now run the voice test with this audio file.');
    rl.close();
  });
  
  // Alternative message if SoX is not installed
  setTimeout(() => {
    console.log('\nIf recording doesn\'t work, you may need to install SoX:');
    console.log('- Windows: https://sourceforge.net/projects/sox/files/sox/');
    console.log('- Mac: brew install sox');
    console.log('- Linux: apt-get install sox');
    console.log('\nAlternatively, record a WAV file using any recording tool and save it as:');
    console.log(outputFile);
  }, 1000);
});